import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { commentReactions, comments } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { and, eq } from "drizzle-orm";

const ALLOWED_EMOJIS = new Set([
  "😂","😭","🥺","😍","🤣","😩","😅","😤","💀","😳","🥰","🤔","😏","😱","🫠","😢",
  "❤️","🔥","💯","✨","👍","👎","💔","🙌","🤌","⭐","💫","👏","🫶","💪","🤦","🤷",
  "🌸","🗡️","⚔️","🐉","🌙","🎌","🧠","👁️","✊","🩸","🌊","⚡","🏹","👊","🫡","🤯",
  "😎","🤓","🥱","😡","🤩","🫢","😬","🙃","😴","🤧","🥴","😫","🤑","😒","🙄","😈",
]);

export async function POST(
  req: Request,
  { params }: { params: { animeId: string; commentId: string } },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { emoji } = await req.json();
  if (!emoji || !ALLOWED_EMOJIS.has(emoji))
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });

  const db = getDb();
  const commentId = params.commentId;

  // Verify comment exists
  const [comment] = await db.select({ id: comments.id }).from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  // Toggle: try insert, if unique violation delete instead
  const existing = await db
    .select({ id: commentReactions.id })
    .from(commentReactions)
    .where(and(eq(commentReactions.commentId, commentId), eq(commentReactions.userId, payload.userId), eq(commentReactions.emoji, emoji)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(commentReactions).where(eq(commentReactions.id, existing[0].id));
    return NextResponse.json({ action: "removed", emoji });
  } else {
    await db.insert(commentReactions).values({ commentId, userId: payload.userId, emoji });
    return NextResponse.json({ action: "added", emoji });
  }
}
