import { getDb } from "@/db";
import { forumThreads, forumPosts, forumThreadVotes, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { and, eq, desc, asc, sql, inArray, ilike, or } from "drizzle-orm";
import { sanitizeBody, rateLimit, maybeSweep, COMMENT_RATE } from "@/lib/comment-helpers";
import { isValidCategory } from "@/constants/forum";

const PAGE_SIZE = 20;
const MAX_TITLE = 200;

const BASE_SELECT = {
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "active"; // active | new | top
  const category = url.searchParams.get("category");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const db = getDb();
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const filters = [];
  if (category && isValidCategory(category)) filters.push(eq(forumThreads.category, category));
  if (q) filters.push(or(ilike(forumThreads.title, `%${q}%`), ilike(forumThreads.body, `%${q}%`)));
  const where = filters.length ? and(...filters) : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(forumThreads)
    .where(where ?? sql`true`);
  const total = countRow?.count ?? 0;

  const rows = await (async () => {
    const base = db
      .select(BASE_SELECT)
      .from(forumThreads)
      .innerJoin(users, eq(users.id, forumThreads.userId))
      .leftJoin(roles, eq(roles.name, users.role))
      .where(where ?? sql`true`);

    // Pinned threads always float to the top regardless of sort.
    if (sort === "new")
      return base
        .orderBy(desc(forumThreads.isPinned), desc(forumThreads.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset);
    if (sort === "top")
      return base
        .orderBy(
          desc(forumThreads.isPinned),
          desc(
            sql<number>`COALESCE((SELECT SUM(CASE WHEN vote=1 THEN 1 WHEN vote=-1 THEN -1 ELSE 0 END) FROM forum_thread_votes WHERE thread_id = ${forumThreads.id}), 0)`,
          ),
          desc(forumThreads.createdAt),
        )
        .limit(PAGE_SIZE)
        .offset(offset);
    // active (default)
    return base
      .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastActivityAt))
      .limit(PAGE_SIZE)
      .offset(offset);
  })();

  const ids = rows.map((r) => r.id);

  let voteAgg: { threadId: string; score: number }[] = [];
  let myVotes: { threadId: string; vote: number }[] = [];
  let replyCounts: { threadId: string; count: number }[] = [];

  if (ids.length > 0) {
    [voteAgg, myVotes, replyCounts] = await Promise.all([
      db
        .select({
          threadId: forumThreadVotes.threadId,
          score: sql<number>`sum(case when ${forumThreadVotes.vote} = 1 then 1 when ${forumThreadVotes.vote} = -1 then -1 else 0 end)::int`,
        })
        .from(forumThreadVotes)
        .where(inArray(forumThreadVotes.threadId, ids))
        .groupBy(forumThreadVotes.threadId)
        .catch(() => []),
      payload
        ? db
            .select({ threadId: forumThreadVotes.threadId, vote: forumThreadVotes.vote })
            .from(forumThreadVotes)
            .where(and(inArray(forumThreadVotes.threadId, ids), eq(forumThreadVotes.userId, payload.userId)))
            .catch(() => [])
        : Promise.resolve([]),
      db
        .select({
          threadId: forumPosts.threadId,
          count: sql<number>`count(*)::int`,
        })
        .from(forumPosts)
        .where(inArray(forumPosts.threadId, ids))
        .groupBy(forumPosts.threadId)
        .catch(() => []),
    ]);
  }

  const scoreMap = new Map(voteAgg.map((v) => [v.threadId, v.score]));
  const myVoteMap = new Map(myVotes.map((v) => [v.threadId, v.vote]));
  const replyMap = new Map(replyCounts.map((r) => [r.threadId, r.count]));

  const threads = rows.map((r) => ({
    ...r,
    score: scoreMap.get(r.id) ?? 0,
    myVote: (myVoteMap.get(r.id) ?? 0) as 0 | 1 | -1,
    replyCount: replyMap.get(r.id) ?? 0,
  }));

  return Response.json({ threads, total, page, hasMore: page * PAGE_SIZE < total });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`forum-thread:${payload.userId}`, COMMENT_RATE))
    return Response.json({ error: "Slow down" }, { status: 429 });

  const raw = await req.json();
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_TITLE) : "";
  const body = sanitizeBody(raw.body);
  const category = isValidCategory(raw.category) ? raw.category : "general";

  if (title.length < 3)
    return Response.json({ error: "Title must be at least 3 characters" }, { status: 400 });
  if (!body)
    return Response.json({ error: "Body cannot be empty" }, { status: 400 });

  const db = getDb();

  const [row] = await db
    .insert(forumThreads)
    .values({ userId: payload.userId, title, body, category })
    .returning({
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
    });

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

  return Response.json(
    {
      ...row,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      role: user?.role,
      roleColor: user?.roleColor,
      score: 0,
      myVote: 0,
      replyCount: 0,
    },
    { status: 201 },
  );
}
