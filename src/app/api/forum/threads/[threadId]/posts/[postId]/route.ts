import { getDb } from "@/db";
import { forumPosts } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { sanitizeBody } from "@/lib/comment-helpers";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
  const { postId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  if (!body) return Response.json({ error: "Reply cannot be empty" }, { status: 400 });

  const db = getDb();
  const result = await db
    .update(forumPosts)
    .set({ body, updatedAt: new Date() })
    .where(and(eq(forumPosts.id, postId), eq(forumPosts.userId, payload.userId)))
    .returning({ id: forumPosts.id });

  if (!result.length) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
  const { postId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [post] = await db
    .select({ userId: forumPosts.userId })
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1);
  if (!post) return Response.json({ error: "Not found" }, { status: 404 });

  const isMod = payload.role === "admin" || payload.role === "moderator";
  if (post.userId !== payload.userId && !isMod)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(forumPosts).where(eq(forumPosts.id, postId));
  return Response.json({ ok: true });
}
