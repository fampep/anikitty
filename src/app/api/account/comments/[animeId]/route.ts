import { getDb } from "@/db";
import { comments, users, roles, commentVotes, commentReactions } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { and, eq, desc, asc, sql, isNull, inArray } from "drizzle-orm";
import {
  sanitizeBody,
  sanitizeAndResolveGifUrl,
  rateLimit,
  maybeSweep,
  COMMENT_RATE,
} from "@/lib/social/comment-helpers";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";
import { grantCommentKittycoins } from "@/lib/shop/kittycoins";
import { blockIfCannotInteract } from "@/lib/security/moderation";

const PAGE_SIZE = 20;

const BASE_SELECT = {
  id: comments.id,
  body: comments.body,
  gifUrl: comments.gifUrl,
  isSpoiler: comments.isSpoiler,
  createdAt: comments.createdAt,
  updatedAt: comments.updatedAt,
  userId: comments.userId,
  parentId: comments.parentId,
  episodeId: comments.episodeId,
  episodeNumber: comments.episodeNumber,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  roleColor: roles.color,
  equippedFrame: users.equippedFrame,
  equippedIcon: users.equippedIcon,
} as const;

type RawRow = {
  id: string;
  body: string;
  gifUrl: string | null;
  isSpoiler: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  userId: string;
  parentId: string | null;
  episodeId: string | null;
  episodeNumber: number | null;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
};

export type EnrichedComment = RawRow & {
  likes: number;
  dislikes: number;
  myVote: 0 | 1 | -1;
  reactions: Record<string, number>;
  myReactions: string[];
  replies: EnrichedComment[];
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ animeId: string }> },
) {
  const { animeId } = await params;
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "new";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const episodeFilter = url.searchParams.get("episodeId");
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb();
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const topLevelWhere =
    episodeFilter && episodeFilter !== "all"
      ? and(eq(comments.animeId, animeId), isNull(comments.parentId), eq(comments.episodeId, episodeFilter))
      : and(eq(comments.animeId, animeId), isNull(comments.parentId));

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(topLevelWhere);
  const total = countRow?.count ?? 0;

  // Top-level comments — sort via IIFE to keep types consistent
  const topLevel: RawRow[] = await (async () => {
    const base = db
      .select(BASE_SELECT)
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .leftJoin(roles, eq(roles.name, users.role))
      .where(topLevelWhere);

    if (sort === "old")
      return base.orderBy(asc(comments.createdAt)).limit(PAGE_SIZE).offset(offset);
    if (sort === "top")
      return base
        .orderBy(
          desc(
            sql<number>`COALESCE((SELECT SUM(CASE WHEN vote=1 THEN 1 WHEN vote=-1 THEN -1 ELSE 0 END) FROM comment_votes WHERE comment_id = ${comments.id}), 0)`,
          ),
          desc(comments.createdAt),
        )
        .limit(PAGE_SIZE)
        .offset(offset);
    return base.orderBy(desc(comments.createdAt)).limit(PAGE_SIZE).offset(offset);
  })();

  const topLevelIds = topLevel.map((c) => c.id);

  // All direct replies for this page of top-level comments
  const replyRows: RawRow[] =
    topLevelIds.length > 0
      ? await db
          .select(BASE_SELECT)
          .from(comments)
          .innerJoin(users, eq(users.id, comments.userId))
          .leftJoin(roles, eq(roles.name, users.role))
          .where(inArray(comments.parentId, topLevelIds))
          .orderBy(asc(comments.createdAt))
      : [];

  const allIds = [...topLevelIds, ...replyRows.map((r) => r.id)];
  const allUserIds = [...new Set([...topLevel, ...replyRows].map((r) => r.userId))];
  const xpStatsMap = await getUsersXpStats(db, allUserIds);

  // Vote + reaction aggregates — parallelized, guarded against missing table
  let voteAgg: { commentId: string; likes: number; dislikes: number }[] = [];
  let myVotes: { commentId: string; vote: number }[] = [];
  let reactionRows: { commentId: string; emoji: string; count: number }[] = [];
  let myReactionRows: { commentId: string; emoji: string }[] = [];

  if (allIds.length > 0) {
    [voteAgg, myVotes, reactionRows, myReactionRows] = await Promise.all([
      db
        .select({
          commentId: commentVotes.commentId,
          likes: sql<number>`sum(case when ${commentVotes.vote} = 1 then 1 else 0 end)::int`,
          dislikes: sql<number>`sum(case when ${commentVotes.vote} = -1 then 1 else 0 end)::int`,
        })
        .from(commentVotes)
        .where(inArray(commentVotes.commentId, allIds))
        .groupBy(commentVotes.commentId)
        .catch(() => []),

      payload
        ? db
            .select({ commentId: commentVotes.commentId, vote: commentVotes.vote })
            .from(commentVotes)
            .where(and(inArray(commentVotes.commentId, allIds), eq(commentVotes.userId, payload.userId)))
            .catch(() => [])
        : Promise.resolve([]),

      db
        .select({
          commentId: commentReactions.commentId,
          emoji: commentReactions.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(commentReactions)
        .where(inArray(commentReactions.commentId, allIds))
        .groupBy(commentReactions.commentId, commentReactions.emoji)
        .catch(() => []),

      payload
        ? db
            .select({ commentId: commentReactions.commentId, emoji: commentReactions.emoji })
            .from(commentReactions)
            .where(and(inArray(commentReactions.commentId, allIds), eq(commentReactions.userId, payload.userId)))
            .catch(() => [])
        : Promise.resolve([]),
    ]);
  }

  // Build lookup maps
  const voteMap = new Map(voteAgg.map((v) => [v.commentId, v]));
  const myVoteMap = new Map(myVotes.map((v) => [v.commentId, v.vote]));
  const reactionMap = new Map<string, Record<string, number>>();
  for (const r of reactionRows) {
    const m = reactionMap.get(r.commentId) ?? {};
    m[r.emoji] = r.count;
    reactionMap.set(r.commentId, m);
  }
  const myReactionMap = new Map<string, string[]>();
  for (const r of myReactionRows) {
    const arr = myReactionMap.get(r.commentId) ?? [];
    arr.push(r.emoji);
    myReactionMap.set(r.commentId, arr);
  }

  const enrich = (row: RawRow): EnrichedComment => {
    const withLevel = attachLevelRole(row, xpStatsMap);
    return {
      ...withLevel,
      likes: voteMap.get(row.id)?.likes ?? 0,
      dislikes: voteMap.get(row.id)?.dislikes ?? 0,
      myVote: (myVoteMap.get(row.id) ?? 0) as 0 | 1 | -1,
      reactions: reactionMap.get(row.id) ?? {},
      myReactions: myReactionMap.get(row.id) ?? [],
      replies: [],
    };
  };

  // Group replies by parent
  const replyByParent = new Map<string, EnrichedComment[]>();
  for (const r of replyRows) {
    const e = enrich(r);
    const arr = replyByParent.get(r.parentId!) ?? [];
    arr.push(e);
    replyByParent.set(r.parentId!, arr);
  }

  const enriched = topLevel.map((c) => {
    const e = enrich(c);
    e.replies = replyByParent.get(c.id) ?? [];
    return e;
  });

  return Response.json({ comments: enriched, total, page, hasMore: page * PAGE_SIZE < total });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ animeId: string }> },
) {
  const { animeId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`post:${payload.userId}`, COMMENT_RATE))
    return Response.json({ error: "Slow down" }, { status: 429 });

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  const gifUrl = await sanitizeAndResolveGifUrl(raw.gifUrl);
  const isSpoiler = !!raw.isSpoiler;
  const parentId: string | null = typeof raw.parentId === "string" ? raw.parentId : null;
  const episodeId: string | null =
    typeof raw.episodeId === "string" && raw.episodeId.trim() ? raw.episodeId.trim() : null;
  const episodeNumber: number | null =
    typeof raw.episodeNumber === "number" && raw.episodeNumber > 0 ? raw.episodeNumber : null;

  if (!body && !gifUrl)
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });

  const db = getDb();
  const blocked = await blockIfCannotInteract(db, payload.userId);
  if (blocked) return Response.json({ error: blocked.error }, { status: blocked.status });

  let resolvedEpisodeId = episodeId;
  let resolvedEpisodeNumber = episodeNumber;

  // parentId must be a top-level comment in this anime (no deep nesting)
  if (parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        episodeId: comments.episodeId,
        episodeNumber: comments.episodeNumber,
      })
      .from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.animeId, animeId)))
      .limit(1);
    if (!parent || parent.parentId !== null)
      return Response.json({ error: "Invalid parent comment" }, { status: 400 });
    resolvedEpisodeId = parent.episodeId;
    resolvedEpisodeNumber = parent.episodeNumber;
  }

  const [row] = await db
    .insert(comments)
    .values({
      userId: payload.userId,
      animeId,
      body,
      gifUrl,
      isSpoiler,
      parentId,
      episodeId: resolvedEpisodeId,
      episodeNumber: resolvedEpisodeNumber,
    })
    .returning({
      id: comments.id,
      body: comments.body,
      gifUrl: comments.gifUrl,
      isSpoiler: comments.isSpoiler,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userId: comments.userId,
      parentId: comments.parentId,
      episodeId: comments.episodeId,
      episodeNumber: comments.episodeNumber,
    });

  void grantCommentKittycoins(db, payload.userId, row.id);

  const [user] = await db
    .select({
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
    })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.id, payload.userId))
    .limit(1);

  const xpStats = await getUsersXpStats(db, [payload.userId]);
  const levelFields = attachLevelRole({ userId: payload.userId }, xpStats);

  return Response.json(
    {
      ...row,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      role: user?.role,
      roleColor: user?.roleColor,
      level: levelFields.level,
      levelRole: levelFields.levelRole,
      levelRoleColor: levelFields.levelRoleColor,
      likes: 0,
      dislikes: 0,
      myVote: 0,
      reactions: {},
      myReactions: [],
      replies: [],
    },
    { status: 201 },
  );
}
