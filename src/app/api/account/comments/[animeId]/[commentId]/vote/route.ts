import { getDb } from "@/db";
import { commentVotes } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ animeId: string; commentId: string }> },
) {
  const { commentId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`vote:${payload.userId}`, 60, 60_000);
  if (limited) return limited;

  const { vote } = await req.json();
  if (vote !== 1 && vote !== -1) return Response.json({ error: "Invalid vote" }, { status: 400 });

  const db = getDb();

  const [existing] = await db
    .select({ vote: commentVotes.vote })
    .from(commentVotes)
    .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, payload.userId)))
    .limit(1);

  if (existing?.vote === vote) {
    await db
      .delete(commentVotes)
      .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, payload.userId)));
  } else {
    await db
      .insert(commentVotes)
      .values({ commentId, userId: payload.userId, vote })
      .onConflictDoUpdate({
        target: [commentVotes.commentId, commentVotes.userId],
        set: { vote },
      });
  }

  return Response.json({ ok: true });
}
