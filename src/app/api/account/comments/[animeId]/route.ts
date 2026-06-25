import { getDb } from "@/db";
import { comments, users, roles, commentVotes } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { and, eq, desc, sql } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const db = getDb();

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      gifUrl: comments.gifUrl,
      createdAt: comments.createdAt,
      userId: comments.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(comments.animeId, animeId))
    .orderBy(desc(comments.createdAt))
    .limit(100);

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(eq(comments.animeId, animeId));

  // Vote aggregates — guarded so a missing table never breaks comment loading
  let voteAgg: { commentId: string; likes: number; dislikes: number }[] = [];
  let myVotes: { commentId: string; vote: number }[] = [];
  try {
    voteAgg = await db
      .select({
        commentId: commentVotes.commentId,
        likes: sql<number>`sum(case when ${commentVotes.vote} = 1 then 1 else 0 end)::int`,
        dislikes: sql<number>`sum(case when ${commentVotes.vote} = -1 then 1 else 0 end)::int`,
      })
      .from(commentVotes)
      .innerJoin(comments, eq(comments.id, commentVotes.commentId))
      .where(eq(comments.animeId, animeId))
      .groupBy(commentVotes.commentId);

    if (payload) {
      myVotes = await db
        .select({ commentId: commentVotes.commentId, vote: commentVotes.vote })
        .from(commentVotes)
        .innerJoin(comments, eq(comments.id, commentVotes.commentId))
        .where(and(eq(comments.animeId, animeId), eq(commentVotes.userId, payload.userId)));
    }
  } catch { /* comment_votes table not yet migrated — return comments without vote data */ }

  const voteMap = new Map(voteAgg.map((v) => [v.commentId, v]));
  const myVoteMap = new Map(myVotes.map((v) => [v.commentId, v.vote]));

  const enriched = rows.map((c) => ({
    ...c,
    likes: voteMap.get(c.id)?.likes ?? 0,
    dislikes: voteMap.get(c.id)?.dislikes ?? 0,
    myVote: (myVoteMap.get(c.id) ?? 0) as 0 | 1 | -1,
  }));

  return Response.json({ comments: enriched, total: total[0]?.count ?? 0 });
}

export async function POST(req: Request, { params }: { params: Promise<{ animeId: string }> }) {
  const { animeId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { body, gifUrl } = await req.json();
  const trimmedBody = typeof body === "string" ? body.trim().slice(0, 1000) : "";
  const trimmedGif = typeof gifUrl === "string" ? gifUrl.trim().slice(0, 2000) : null;

  if (!trimmedBody && !trimmedGif) {
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .insert(comments)
    .values({ userId: payload.userId, animeId, body: trimmedBody, gifUrl: trimmedGif })
    .returning({ id: comments.id, body: comments.body, gifUrl: comments.gifUrl, createdAt: comments.createdAt, userId: comments.userId });

  const [user] = await db
    .select({ username: users.username, avatarUrl: users.avatarUrl, role: users.role, roleColor: roles.color })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.id, payload.userId))
    .limit(1);

  return Response.json({
    ...row,
    username: user?.username,
    avatarUrl: user?.avatarUrl,
    role: user?.role,
    roleColor: user?.roleColor,
    likes: 0,
    dislikes: 0,
    myVote: 0,
  }, { status: 201 });
}
