import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { chatMessages, chatReactions } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import type { ChatReactionMap } from "@/lib/social/chat-local";

/**
 * GET /api/chat/reactions?ids=id1,id2
 * Returns reaction map for the given message ids.
 */
export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (ids.length === 0) {
    return Response.json({ reactions: {} satisfies ChatReactionMap });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        messageId: chatReactions.messageId,
        userId: chatReactions.userId,
        emoji: chatReactions.emoji,
      })
      .from(chatReactions)
      .where(inArray(chatReactions.messageId, ids));

    const map: ChatReactionMap = {};
    for (const row of rows) {
      if (!map[row.messageId]) map[row.messageId] = {};
      if (!map[row.messageId][row.emoji]) map[row.messageId][row.emoji] = [];
      map[row.messageId][row.emoji].push(row.userId);
    }
    return Response.json({ reactions: map });
  } catch {
    return Response.json({ reactions: {} });
  }
}

/**
 * POST /api/chat/reactions
 * Body: { messageId, emoji } — toggles the caller's reaction.
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  let body: { messageId?: string; emoji?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageId = body.messageId?.trim();
  const emoji = body.emoji?.trim();
  if (!messageId || !emoji || emoji.length > 32) {
    return Response.json({ error: "Invalid messageId or emoji" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [msg] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    if (!msg) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const [existing] = await db
      .select({ id: chatReactions.id })
      .from(chatReactions)
      .where(
        and(
          eq(chatReactions.messageId, messageId),
          eq(chatReactions.userId, user.id),
          eq(chatReactions.emoji, emoji),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(chatReactions).where(eq(chatReactions.id, existing.id));
      return Response.json({ toggled: "removed" });
    }

    await db.insert(chatReactions).values({
      messageId,
      userId: user.id,
      emoji,
    });
    return Response.json({ toggled: "added" });
  } catch (e) {
    console.error("[chat/reactions]", e);
    return Response.json({ error: "Failed to react" }, { status: 500 });
  }
}
