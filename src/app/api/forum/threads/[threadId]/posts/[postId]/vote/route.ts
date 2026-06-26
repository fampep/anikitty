import { getDb } from "@/db";
import { forumPostVotes } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { rateLimit, maybeSweep, VOTE_RATE } from "@/lib/comment-helpers";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
  const { postId } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`forum-vote:${payload.userId}`, VOTE_RATE))
    return Response.json({ error: "Slow down" }, { status: 429 });

  const { vote } = await req.json();
  if (vote !== 1 && vote !== -1) return Response.json({ error: "Invalid vote" }, { status: 400 });

  const db = getDb();
  const [existing] = await db
    .select({ vote: forumPostVotes.vote })
    .from(forumPostVotes)
    .where(and(eq(forumPostVotes.postId, postId), eq(forumPostVotes.userId, payload.userId)))
    .limit(1);

  if (existing?.vote === vote) {
    await db
      .delete(forumPostVotes)
      .where(and(eq(forumPostVotes.postId, postId), eq(forumPostVotes.userId, payload.userId)));
  } else {
    await db
      .insert(forumPostVotes)
      .values({ postId, userId: payload.userId, vote })
      .onConflictDoUpdate({
        target: [forumPostVotes.postId, forumPostVotes.userId],
        set: { vote },
      });
  }

  return Response.json({ ok: true });
}
