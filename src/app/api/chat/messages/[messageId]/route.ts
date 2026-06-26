import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  if (!messageId) return Response.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const [existing] = await db
    .select({ userId: chatMessages.userId })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const isStaff = payload.role === "admin" || payload.role === "moderator";
  const isOwner = existing.userId === payload.userId;
  if (!isStaff && !isOwner) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
  return Response.json({ ok: true });
}
