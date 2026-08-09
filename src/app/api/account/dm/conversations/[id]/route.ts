import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { dmConversations, dmMessages, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { markConversationRead, buildConversationSummary } from "@/lib/social/dm-server";
import { decryptStoredMessage } from "@/lib/security/message-crypto";
import { and, asc, desc, eq, gt } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

const PAGE_LIMIT = 100;

export async function GET(req: Request, { params }: Params) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [conv] = await db.select().from(dmConversations).where(eq(dmConversations.id, id)).limit(1);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.participantAId !== payload.userId && conv.participantBId !== payload.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const after = url.searchParams.get("after");

  let rows;
  if (after) {
    const afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "Invalid after timestamp" }, { status: 400 });
    }
    rows = await db
      .select({
        id: dmMessages.id,
        conversationId: dmMessages.conversationId,
        senderId: dmMessages.senderId,
        body: dmMessages.body,
        gifUrl: dmMessages.gifUrl,
        createdAt: dmMessages.createdAt,
        updatedAt: dmMessages.updatedAt,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(dmMessages)
      .innerJoin(users, eq(users.id, dmMessages.senderId))
      .where(and(eq(dmMessages.conversationId, id), gt(dmMessages.createdAt, afterDate)))
      .orderBy(asc(dmMessages.createdAt))
      .limit(PAGE_LIMIT);
  } else {
    rows = await db
      .select({
        id: dmMessages.id,
        conversationId: dmMessages.conversationId,
        senderId: dmMessages.senderId,
        body: dmMessages.body,
        gifUrl: dmMessages.gifUrl,
        createdAt: dmMessages.createdAt,
        updatedAt: dmMessages.updatedAt,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(dmMessages)
      .innerJoin(users, eq(users.id, dmMessages.senderId))
      .where(eq(dmMessages.conversationId, id))
      .orderBy(desc(dmMessages.createdAt))
      .limit(PAGE_LIMIT);
    rows.reverse();
    await markConversationRead(id, payload.userId);
  }

  const conversation = await buildConversationSummary(conv, payload.userId);
  const messages = rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    senderId: r.senderId,
    username: r.username,
    avatarUrl: r.avatarUrl,
    body: decryptStoredMessage(r.body),
    gifUrl: r.gifUrl,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
    isOwn: r.senderId === payload.userId,
  }));

  return NextResponse.json({ conversation, messages });
}
