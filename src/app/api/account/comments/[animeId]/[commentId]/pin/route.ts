import { getDb } from "@/db";
import { comments, users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { roleHasPermission } from "@/lib/security/permissions";
import { and, eq, isNull } from "drizzle-orm";

// Toggle a top-level comment's pinned state. Moderators only.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ animeId: string; commentId: string }> },
) {
  const { animeId, commentId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [caller] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  const isMod = caller
    ? await roleHasPermission(db, caller.role, "comments.moderate")
    : false;
  if (!isMod) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [target] = await db
    .select({ id: comments.id, parentId: comments.parentId, pinnedAt: comments.pinnedAt })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.animeId, animeId), isNull(comments.parentId)))
    .limit(1);
  if (!target) return Response.json({ error: "Comment not found" }, { status: 404 });

  const pinned = target.pinnedAt === null;
  await db
    .update(comments)
    .set({ pinnedAt: pinned ? new Date() : null })
    .where(eq(comments.id, commentId));

  return Response.json({ ok: true, pinned });
}
