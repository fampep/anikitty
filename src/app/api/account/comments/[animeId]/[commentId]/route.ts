import { getDb } from "@/db";
import { comments, users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { roleHasPermission } from "@/lib/permissions";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ animeId: string; commentId: string }> },
) {
  const { commentId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json();
  const trimmed = typeof body === "string" ? body.trim().slice(0, 1000) : "";
  if (!trimmed) return Response.json({ error: "Body cannot be empty" }, { status: 400 });

  const db = getDb();
  await db
    .update(comments)
    .set({ body: trimmed, updatedAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.userId, payload.userId)));

  return Response.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ animeId: string; commentId: string }> },
) {
  const { commentId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  // Admins and moderators can delete any comment; regular users only their own
  const [caller] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  const isMod = caller
    ? await roleHasPermission(db, caller.role, "comments.moderate")
    : false;

  const condition = isMod
    ? eq(comments.id, commentId)
    : and(eq(comments.id, commentId), eq(comments.userId, payload.userId));

  await db.delete(comments).where(condition);

  return Response.json({ ok: true });
}
