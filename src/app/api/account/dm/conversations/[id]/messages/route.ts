import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { dmConversations, dmMessages, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { createDmNotification } from "@/lib/social/dm-server";
import { sanitizeBody, sanitizeAndResolveGifUrl, rateLimit } from "@/lib/social/comment-helpers";
import { assertMessageEncryptionConfigured, encryptStoredMessage } from "@/lib/security/message-crypto";
import { blockIfCannotInteract } from "@/lib/security/moderation";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

const DM_RATE = { windowMs: 30_000, max: 20 } as const;

export async function POST(req: Request, { params }: Params) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`dm:${payload.userId}`, DM_RATE)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  const misconfigured = assertMessageEncryptionConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const { id } = await params;
  const db = getDb();
  const blocked = await blockIfCannotInteract(db, payload.userId);
  if (blocked) return NextResponse.json({ error: blocked.error }, { status: blocked.status });

  const [conv] = await db.select().from(dmConversations).where(eq(dmConversations.id, id)).limit(1);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.participantAId !== payload.userId && conv.participantBId !== payload.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  const gifUrl = await sanitizeAndResolveGifUrl(raw.gifUrl);
  if (!body && !gifUrl) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const [row] = await db
    .insert(dmMessages)
    .values({
      conversationId: id,
      senderId: payload.userId,
      body: encryptStoredMessage(body || ""),
      gifUrl,
    })
    .returning();

  await db
    .update(dmConversations)
    .set({ lastActivityAt: new Date() })
    .where(eq(dmConversations.id, id));

  const [sender] = await db
    .select({ username: users.username, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  const recipientId =
    conv.participantAId === payload.userId ? conv.participantBId : conv.participantAId;

  await createDmNotification({
    recipientId,
    senderId: payload.userId,
    senderUsername: sender?.username ?? "user",
    conversationId: id,
    preview: body || (gifUrl ? "GIF" : ""),
  });

  const message = {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    username: sender?.username ?? "",
    avatarUrl: sender?.avatarUrl ?? null,
    body: body || "",
    gifUrl: row.gifUrl,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    isOwn: true,
  };

  return NextResponse.json({ message }, { status: 201 });
}
