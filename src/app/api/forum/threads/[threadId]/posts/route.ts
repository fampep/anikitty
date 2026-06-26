import { getDb } from "@/db";
import { forumThreads, forumPosts, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";
import { sanitizeBody, rateLimit, maybeSweep, COMMENT_RATE } from "@/lib/comment-helpers";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`forum-post:${payload.userId}`, COMMENT_RATE))
    return Response.json({ error: "Slow down" }, { status: 429 });

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  if (!body) return Response.json({ error: "Reply cannot be empty" }, { status: 400 });

  const db = getDb();

  const [thread] = await db
    .select({ id: forumThreads.id, isLocked: forumThreads.isLocked })
    .from(forumThreads)
    .where(eq(forumThreads.id, threadId))
    .limit(1);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });
  if (thread.isLocked) return Response.json({ error: "Thread is locked" }, { status: 403 });

  const [row] = await db
    .insert(forumPosts)
    .values({ threadId, userId: payload.userId, body })
    .returning({
      id: forumPosts.id,
      body: forumPosts.body,
      createdAt: forumPosts.createdAt,
      updatedAt: forumPosts.updatedAt,
      userId: forumPosts.userId,
    });

  // Bump thread activity so it floats up in "active" sorting.
  await db
    .update(forumThreads)
    .set({ lastActivityAt: new Date() })
    .where(eq(forumThreads.id, threadId));

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
    },
    { status: 201 },
  );
}
