import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { w2gMessages, w2gMembers } from "@/db/schema";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { sanitizeBody, rateLimit, maybeSweep } from "@/lib/comment-helpers";
import { normalizeW2gCode } from "@/lib/w2g-code";
import { getRoomByCode } from "@/lib/w2g-server";
import {
  assertMessageEncryptionConfigured,
  encryptStoredMessage,
} from "@/lib/message-crypto";
import { and, eq } from "drizzle-orm";

const W2G_CHAT_RATE = { windowMs: 30_000, max: 20 } as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeW2gCode(rawCode);
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`w2g-chat:${payload.userId}`, W2G_CHAT_RATE)) {
    return NextResponse.json({ error: "Slow down" }, { status: 429 });
  }

  const misconfigured = assertMessageEncryptionConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const room = await getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const db = getDb();
  const [member] = await db
    .select({ id: w2gMembers.id })
    .from(w2gMembers)
    .where(and(eq(w2gMembers.roomId, room.id), eq(w2gMembers.userId, payload.userId)))
    .limit(1);

  if (!member) return NextResponse.json({ error: "Join the room first" }, { status: 403 });

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  if (!body) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const [row] = await db
    .insert(w2gMessages)
    .values({ roomId: room.id, userId: payload.userId, body: encryptStoredMessage(body) })
    .returning({
      id: w2gMessages.id,
      body: w2gMessages.body,
      createdAt: w2gMessages.createdAt,
      userId: w2gMessages.userId,
    });

  const [user] = await db
    .select({ username: users.username, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  return NextResponse.json(
    {
      id: row.id,
      body,
      userId: row.userId,
      username: user?.username ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    },
    { status: 201 },
  );
}
