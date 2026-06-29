import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { chatMessages, users, roles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import {
  CHAT_MESSAGE_TTL_MS,
  getChatCutoffDate,
  isChatMessageActive,
} from "@/lib/social/chat-config";
import { purgeExpiredChatMessages } from "@/lib/social/chat-sweep";
import { decryptStoredMessage } from "@/lib/security/message-crypto";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));

  const db = getDb();
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      gifUrl: chatMessages.gifUrl,
      createdAt: chatMessages.createdAt,
      userId: chatMessages.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const cutoff = getChatCutoffDate();

  const countsResult = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= ${cutoff})::int AS active,
      COUNT(*) FILTER (WHERE created_at < ${cutoff})::int AS expired
    FROM chat_messages
  `);
  const counts = (countsResult as Record<string, unknown>[])[0] ?? {};
  const totalCount = Number(counts.total ?? 0);
  const activeCount = Number(counts.active ?? 0);
  const expiredCount = Number(counts.expired ?? 0);

  return NextResponse.json({
    messageTtlMs: CHAT_MESSAGE_TTL_MS,
    totalCount,
    activeCount,
    expiredCount,
    messages: rows.map((r) => ({
      ...r,
      body: decryptStoredMessage(r.body),
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      active: isChatMessageActive(r.createdAt ?? new Date()),
    })),
  });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const db = getDb();

  if (body.purgeAll === true) {
    const deleted = await db
      .delete(chatMessages)
      .returning({ id: chatMessages.id });
    return NextResponse.json({ ok: true, deleted: deleted.length });
  }

  if (body.purgeExpired === true) {
    const deleted = await purgeExpiredChatMessages(db);
    return NextResponse.json({ ok: true, deleted });
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
  return NextResponse.json({ ok: true });
}
