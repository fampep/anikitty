import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ animeId: string; commentId: string }> },
) {
  const { commentId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.userId, payload.userId)));

  return Response.json({ ok: true });
}
