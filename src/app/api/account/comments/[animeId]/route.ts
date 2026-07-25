import { getDb } from "@/db";
import { comments, users, roles, commentVotes, commentReactions } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { and, eq, desc, asc, sql, isNull, inArray, notInArray } from "drizzle-orm";
import { getBlockedUserIds } from "@/lib/social/blocks";
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
import { notifyCommentTargets } from "@/lib/social/comment-notifications";
import { decryptStoredText, encryptStoredText } from "@/lib/security/ugc-crypto";

const PAGE_SIZE = 20;

const BASE_SELECT = {
  id: comments.id,
  body: comments.body,
  gifUrl: comments.gifUrl,
  isSpoiler: comments.isSpoiler,
  pinnedAt: comments.pinnedAt,
  likeCount: comments.likeCount,
  dislikeCount: comments.dislikeCount,
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
  discordBoosting: users.discordBoosting,
  equippedFrame: users.equippedFrame,
  equippedIcon: users.equippedIcon,
} as const;

type RawRow = {
  id: string;
  body: string;
  gifUrl: string | null;
  isSpoiler: boolean;
  pinnedAt: Date | null;
  likeCount: number;
  dislikeCount: number;
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
  discordBoosting?: boolean | null;
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

  // Hide comments from users the viewer has blocked.
  const blockedIds = payload ? await getBlockedUserIds(db, payload.userId) : [];
  const notBlocked = blockedIds.length > 0 ? notInArray(comments.userId, blockedIds) : undefined;

  const topLevelWhere =
    episodeFilter && episodeFilter !== "all"
      ? and(eq(comments.animeId, animeId), isNull(comments.parentId), eq(comments.episodeId, episodeFilter), notBlocked)
      : and(eq(comments.animeId, animeId), isNull(comments.parentId), notBlocked);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(topLevelWhere);
  const total = countRow?.count ?? 0;

  if (url.searchParams.get("countOnly") === "1") {
    if (url.searchParams.get("preview") !== "1") {
      return Response.json({ total });
    }

    const previewRows = await db
      .select({
        id: comments.id,
        body: comments.body,
        gifUrl: comments.gifUrl,
        isSpoiler: comments.isSpoiler,
        username: users.username,
        avatarUrl: users.avatarUrl,
        equippedFrame: users.equippedFrame,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(topLevelWhere)
      .orderBy(desc(comments.createdAt))
      .limit(2);

    return Response.json({
      total,
      previews: previewRows.map((row) => {
        const plain = decryptStoredText(row.body ?? "");
        return {
          id: row.id,
          username: row.username,
          avatarUrl: row.avatarUrl,
          equippedFrame: row.equippedFrame,
          isSpoiler: row.isSpoiler,
          body: row.isSpoiler
            ? null
            : plain.trim()
              ? plain.trim().slice(0, 96)
              : row.gifUrl
                ? null
                : "",
          gifUrl: row.isSpoiler ? null : row.gifUrl,
        };
      }),
    });
  }

  // Pinned comments always sort above the rest.
  const pinnedFirst = desc(sql<boolean>`(${comments.pinnedAt} is not null)`);

  // Top-level comments — sort via IIFE to keep types consistent
  const topLevel: RawRow[] = await (async () => {
    const base = db
      .select(BASE_SELECT)
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .leftJoin(roles, eq(roles.name, users.role))
      .where(topLevelWhere);

    if (sort === "old")
      return base.orderBy(pinnedFirst, asc(comments.createdAt)).limit(PAGE_SIZE).offset(offset);
    if (sort === "best")
      // Wilson lower bound of the positive-vote fraction (95% confidence) — ranks
      // by "how good", not just net score, so a 5/5 beats an early 30/25.
      // Uses the denormalized tallies, so no per-row subquery over votes.
      return base
        .orderBy(
          pinnedFirst,
          desc(sql<number>`CASE WHEN (${comments.likeCount} + ${comments.dislikeCount}) = 0 THEN 0 ELSE
            ((${comments.likeCount} + 1.9208) / (${comments.likeCount} + ${comments.dislikeCount})
              - 1.96 * sqrt((${comments.likeCount}::float * ${comments.dislikeCount}) / (${comments.likeCount} + ${comments.dislikeCount}) + 0.9604) / (${comments.likeCount} + ${comments.dislikeCount}))
            / (1 + 3.8416 / (${comments.likeCount} + ${comments.dislikeCount}))
          END`),
          desc(comments.createdAt),
        )
        .limit(PAGE_SIZE)
        .offset(offset);
    if (sort === "top")
      return base
        .orderBy(
          pinnedFirst,
          desc(sql<number>`(${comments.likeCount} - ${comments.dislikeCount})`),
          desc(comments.createdAt),
        )
        .limit(PAGE_SIZE)
        .offset(offset);
    return base.orderBy(pinnedFirst, desc(comments.createdAt)).limit(PAGE_SIZE).offset(offset);
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
          .where(and(inArray(comments.parentId, topLevelIds), notBlocked))
          .orderBy(asc(comments.createdAt))
      : [];

  const allIds = [...topLevelIds, ...replyRows.map((r) => r.id)];
  const allUserIds = [...new Set([...topLevel, ...replyRows].map((r) => r.userId))];
  const xpStatsMap = await getUsersXpStats(db, allUserIds);

  // Like/dislike totals come straight off the denormalized columns; we only
  // need to look up the viewer's own vote + reactions here.
  let myVotes: { commentId: string; vote: number }[] = [];
  let reactionRows: { commentId: string; emoji: string; count: number }[] = [];
  let myReactionRows: { commentId: string; emoji: string }[] = [];

  if (allIds.length > 0) {
    [myVotes, reactionRows, myReactionRows] = await Promise.all([
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
      body: decryptStoredText(row.body ?? ""),
      likes: row.likeCount ?? 0,
      dislikes: row.dislikeCount ?? 0,
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
      body: encryptStoredText(body),
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
  void (async () => {
    const { maybeAnnounceDiscordLevelUp } = await import(
      "@/lib/bot/notify-discord-levelup"
    );
    await maybeAnnounceDiscordLevelUp(db, payload.userId);
  })();

  const [user] = await db
    .select({
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
      discordBoosting: users.discordBoosting,
    })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.id, payload.userId))
    .limit(1);

  const xpStats = await getUsersXpStats(db, [payload.userId]);
  const levelFields = attachLevelRole({ userId: payload.userId }, xpStats);

  if (body && user?.username) {
    const linkUrl = resolvedEpisodeId
      ? `/anime/watch?anime=${encodeURIComponent(animeId)}&episode=${encodeURIComponent(resolvedEpisodeId)}`
      : `/anime/${encodeURIComponent(animeId)}`;
    void notifyCommentTargets(db, {
      actorUserId: payload.userId,
      actorUsername: user.username,
      commentId: row.id,
      parentId,
      body,
      linkUrl,
    });
  }

  return Response.json(
    {
      ...row,
      body: decryptStoredText(row.body ?? ""),
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      role: user?.role,
      roleColor: user?.roleColor,
      discordBoosting: user?.discordBoosting ?? false,
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
