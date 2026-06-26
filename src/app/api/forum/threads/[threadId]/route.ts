import { getDb } from "@/db";
import { forumThreads, forumPosts, forumThreadVotes, forumPostVotes, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { and, eq, asc, sql, inArray } from "drizzle-orm";
import { sanitizeBody } from "@/lib/comment-helpers";
import { isValidCategory } from "@/constants/forum";

const THREAD_SELECT = {
  id: forumThreads.id,
  title: forumThreads.title,
  body: forumThreads.body,
  category: forumThreads.category,
  isPinned: forumThreads.isPinned,
  isLocked: forumThreads.isLocked,
  createdAt: forumThreads.createdAt,
  updatedAt: forumThreads.updatedAt,
  lastActivityAt: forumThreads.lastActivityAt,
  userId: forumThreads.userId,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  roleColor: roles.color,
} as const;

const POST_SELECT = {
  id: forumPosts.id,
  body: forumPosts.body,
  createdAt: forumPosts.createdAt,
  updatedAt: forumPosts.updatedAt,
  userId: forumPosts.userId,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  roleColor: roles.color,
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const db = getDb();
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const [thread] = await db
    .select(THREAD_SELECT)
    .from(forumThreads)
    .innerJoin(users, eq(users.id, forumThreads.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(forumThreads.id, threadId))
    .limit(1);

  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });

  const posts = await db
    .select(POST_SELECT)
    .from(forumPosts)
    .innerJoin(users, eq(users.id, forumPosts.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(forumPosts.threadId, threadId))
    .orderBy(asc(forumPosts.createdAt));

  const postIds = posts.map((p) => p.id);

  // Thread vote score + my vote
  const [threadScoreRow] = await db
    .select({
      score: sql<number>`COALESCE(sum(case when ${forumThreadVotes.vote} = 1 then 1 when ${forumThreadVotes.vote} = -1 then -1 else 0 end), 0)::int`,
    })
    .from(forumThreadVotes)
    .where(eq(forumThreadVotes.threadId, threadId))
    .catch(() => [{ score: 0 }] as any);

  let myThreadVote = 0;
  if (payload) {
    const [v] = await db
      .select({ vote: forumThreadVotes.vote })
      .from(forumThreadVotes)
      .where(and(eq(forumThreadVotes.threadId, threadId), eq(forumThreadVotes.userId, payload.userId)))
      .limit(1)
      .catch(() => [] as any);
    myThreadVote = v?.vote ?? 0;
  }

  // Post vote aggregates
  let postVoteAgg: { postId: string; score: number }[] = [];
  let myPostVotes: { postId: string; vote: number }[] = [];
  if (postIds.length > 0) {
    [postVoteAgg, myPostVotes] = await Promise.all([
      db
        .select({
          postId: forumPostVotes.postId,
          score: sql<number>`sum(case when ${forumPostVotes.vote} = 1 then 1 when ${forumPostVotes.vote} = -1 then -1 else 0 end)::int`,
        })
        .from(forumPostVotes)
        .where(inArray(forumPostVotes.postId, postIds))
        .groupBy(forumPostVotes.postId)
        .catch(() => []),
      payload
        ? db
            .select({ postId: forumPostVotes.postId, vote: forumPostVotes.vote })
            .from(forumPostVotes)
            .where(and(inArray(forumPostVotes.postId, postIds), eq(forumPostVotes.userId, payload.userId)))
            .catch(() => [])
        : Promise.resolve([]),
    ]);
  }

  const postScoreMap = new Map(postVoteAgg.map((v) => [v.postId, v.score]));
  const myPostVoteMap = new Map(myPostVotes.map((v) => [v.postId, v.vote]));

  const enrichedPosts = posts.map((p) => ({
    ...p,
    score: postScoreMap.get(p.id) ?? 0,
    myVote: (myPostVoteMap.get(p.id) ?? 0) as 0 | 1 | -1,
  }));

  return Response.json({
    thread: {
      ...thread,
      score: threadScoreRow?.score ?? 0,
      myVote: (myThreadVote ?? 0) as 0 | 1 | -1,
    },
    posts: enrichedPosts,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [thread] = await db
    .select({ userId: forumThreads.userId })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });

  const isMod = payload.role === "admin" || payload.role === "moderator";
  const isOwner = thread.userId === payload.userId;

  const raw = await req.json();
  const updates: Record<string, any> = {};

  // Owner can edit title/body/category.
  if (isOwner) {
    if (typeof raw.title === "string") {
      const title = raw.title.trim().slice(0, 200);
      if (title.length < 3) return Response.json({ error: "Title too short" }, { status: 400 });
      updates.title = title;
    }
    if (typeof raw.body === "string") {
      const body = sanitizeBody(raw.body);
      if (!body) return Response.json({ error: "Body cannot be empty" }, { status: 400 });
      updates.body = body;
    }
    if (isValidCategory(raw.category)) updates.category = raw.category;
    if (Object.keys(updates).length) updates.updatedAt = new Date();
  }

  // Mods/admins can pin and lock.
  if (isMod) {
    if (typeof raw.isPinned === "boolean") updates.isPinned = raw.isPinned;
    if (typeof raw.isLocked === "boolean") updates.isLocked = raw.isLocked;
  }

  if (!Object.keys(updates).length)
    return Response.json({ error: "Nothing to update" }, { status: 400 });

  await db.update(forumThreads).set(updates).where(eq(forumThreads.id, threadId));
  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [thread] = await db
    .select({ userId: forumThreads.userId })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });

  const isMod = payload.role === "admin" || payload.role === "moderator";
  if (thread.userId !== payload.userId && !isMod)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(forumThreads).where(eq(forumThreads.id, threadId));
  return Response.json({ ok: true });
}
