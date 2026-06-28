import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { userNotifications, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth-jwt";
import { decryptStoredMessage } from "@/lib/message-crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10)));
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const db = getDb();
  const rows = await db
    .select({
      id: userNotifications.id,
      type: userNotifications.type,
      title: userNotifications.title,
      body: userNotifications.body,
      linkUrl: userNotifications.linkUrl,
      readAt: userNotifications.readAt,
      createdAt: userNotifications.createdAt,
      actorUsername: users.username,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(userNotifications)
    .leftJoin(users, eq(users.id, userNotifications.actorUserId))
    .where(
      unreadOnly
        ? and(eq(userNotifications.userId, payload.userId), isNull(userNotifications.readAt))
        : eq(userNotifications.userId, payload.userId),
    )
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);

  return NextResponse.json({
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: decryptStoredMessage(r.body ?? ""),
      linkUrl: r.linkUrl,
      actorUsername: r.actorUsername,
      actorAvatarUrl: r.actorAvatarUrl,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, markAll } = await req.json();
  const db = getDb();
  const now = new Date();

  if (markAll) {
    await db
      .update(userNotifications)
      .set({ readAt: now })
      .where(and(eq(userNotifications.userId, payload.userId), isNull(userNotifications.readAt)));
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const safeIds = ids.filter((id: unknown) => typeof id === "string").slice(0, 50);
  await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, payload.userId),
        inArray(userNotifications.id, safeIds),
        isNull(userNotifications.readAt),
      ),
    );

  return NextResponse.json({ ok: true });
}
