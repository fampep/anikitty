import { getDb } from "@/db";
import { chatMessages, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { sanitizeBody, rateLimit, maybeSweep } from "@/lib/social/comment-helpers";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";
import {
  assertMessageEncryptionConfigured,
  decryptStoredMessage,
  encryptStoredMessage,
} from "@/lib/security/message-crypto";
import { eq } from "drizzle-orm";
import { blockIfCannotInteract } from "@/lib/security/moderation";
import { roleHasPermission } from "@/lib/security/permissions";

const EDIT_RATE = { windowMs: 30_000, max: 20 } as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`chat-edit:${payload.userId}`, EDIT_RATE)) {
    return Response.json({ error: "Slow down" }, { status: 429 });
  }

  const misconfigured = assertMessageEncryptionConfigured();
  if (misconfigured) {
    return Response.json({ error: misconfigured }, { status: 503 });
  }

  const { messageId } = await params;
  if (!messageId) return Response.json({ error: "Not found" }, { status: 404 });

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  if (!body) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const db = getDb();
  const blocked = await blockIfCannotInteract(db, payload.userId);
  if (blocked) return Response.json({ error: blocked.error }, { status: blocked.status });

  const [existing] = await db
    .select({
      userId: chatMessages.userId,
      gifUrl: chatMessages.gifUrl,
    })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== payload.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [row] = await db
    .update(chatMessages)
    .set({ body: encryptStoredMessage(body), updatedAt: new Date() })
    .where(eq(chatMessages.id, messageId))
    .returning({
      id: chatMessages.id,
      body: chatMessages.body,
      gifUrl: chatMessages.gifUrl,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
      userId: chatMessages.userId,
    });

  const [user] = await db
    .select({
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
    })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.id, payload.userId))
    .limit(1);

  const xpStatsMap = await getUsersXpStats(db, [payload.userId]);
  const enriched = attachLevelRole(
    {
      ...row,
      body,
      username: user?.username ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      role: user?.role ?? "user",
      roleColor: user?.roleColor ?? null,
    },
    xpStatsMap,
  );

  const message = {
    ...enriched,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };

  return Response.json({ message });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  if (!messageId) return Response.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  const [existing] = await db
    .select({ userId: chatMessages.userId })
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const isStaff = await roleHasPermission(db, payload.role, "chat.moderate");
  const isOwner = existing.userId === payload.userId;
  if (!isStaff && !isOwner) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
  return Response.json({ ok: true });
}
