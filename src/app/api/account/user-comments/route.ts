import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      animeId: comments.animeId,
      body: comments.body,
      gifUrl: comments.gifUrl,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.userId, payload.userId))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return Response.json({ comments: rows });
}
