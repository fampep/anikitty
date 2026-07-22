import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { chatMessages, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { sanitizeBody, sanitizeAndResolveGifUrl, rateLimit, maybeSweep } from "@/lib/social/comment-helpers";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";
import { CHAT_MESSAGE_TTL_MS, getChatCutoffDate } from "@/lib/social/chat-config";
import { maybeSweepChatMessages } from "@/lib/social/chat-sweep";
import { blockIfCannotInteract } from "@/lib/security/moderation";
import {
  assertMessageEncryptionConfigured,
  decryptStoredMessage,
  encryptStoredMessage,
} from "@/lib/security/message-crypto";
import { eq, desc, gt, asc, and, or, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const PAGE_LIMIT = 100;
const CHAT_RATE = { windowMs: 30_000, max: 15 } as const;

const replyMessages = alias(chatMessages, "reply_messages");
const replyUsers = alias(users, "reply_users");

type MessageRow = {
  id: string;
  body: string;
  gifUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  roleColor: string | null;
  discordBoosting?: boolean | null;
  replyToId: string | null;
  replyBody: string | null;
  replyGifUrl: string | null;
  replyUsername: string | null;
};

function messageSelect() {
  return {
    id: chatMessages.id,
    body: chatMessages.body,
    gifUrl: chatMessages.gifUrl,
    createdAt: chatMessages.createdAt,
    updatedAt: chatMessages.updatedAt,
    userId: chatMessages.userId,
    username: users.username,
    avatarUrl: users.avatarUrl,
    role: users.role,
    roleColor: roles.color,
    discordBoosting: users.discordBoosting,
    replyToId: chatMessages.replyToId,
    replyBody: replyMessages.body,
    replyGifUrl: replyMessages.gifUrl,
    replyUsername: replyUsers.username,
  };
}

function baseMessageQuery(db: ReturnType<typeof getDb>) {
  return db
    .select(messageSelect())
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .leftJoin(replyMessages, eq(chatMessages.replyToId, replyMessages.id))
    .leftJoin(replyUsers, eq(replyMessages.userId, replyUsers.id));
}

async function enrichMessages(rows: MessageRow[]) {
  const db = getDb();
  const xpStatsMap = await getUsersXpStats(db, rows.map((r) => r.userId));
  return rows.map((r) => {
    const enriched = attachLevelRole(r, xpStatsMap);
    const replyBody = r.replyBody ? decryptStoredMessage(r.replyBody) : "";
    return {
      ...enriched,
      body: decryptStoredMessage(r.body),
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      replyTo:
        r.replyToId && r.replyUsername
          ? {
              id: r.replyToId,
              username: r.replyUsername,
              body: replyBody,
              gifUrl: r.replyGifUrl,
            }
          : null,
    };
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(
    PAGE_LIMIT,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(PAGE_LIMIT), 10)),
  );

  const db = getDb();
  const cutoff = getChatCutoffDate();
  await maybeSweepChatMessages(db);

  if (after) {
    const afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return Response.json({ error: "Invalid after timestamp" }, { status: 400 });
    }

    const rows = await baseMessageQuery(db)
      .where(
        and(
          gt(chatMessages.createdAt, cutoff),
          or(
            gt(chatMessages.createdAt, afterDate),
            and(
              isNotNull(chatMessages.updatedAt),
              gt(chatMessages.updatedAt, afterDate),
            ),
          ),
        ),
      )
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit);

    const messages = await enrichMessages(rows);
    return Response.json({ messages, messageTtlMs: CHAT_MESSAGE_TTL_MS });
  }

  const rows = await baseMessageQuery(db)
    .where(gt(chatMessages.createdAt, cutoff))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  rows.reverse();
  const messages = await enrichMessages(rows);
  return Response.json({ messages, messageTtlMs: CHAT_MESSAGE_TTL_MS });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`chat:${payload.userId}`, CHAT_RATE)) {
    return Response.json({ error: "Slow down" }, { status: 429 });
  }

  const misconfigured = assertMessageEncryptionConfigured();
  if (misconfigured) {
    return Response.json({ error: misconfigured }, { status: 503 });
  }

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  const gifUrl = await sanitizeAndResolveGifUrl(raw.gifUrl);
  const replyToId =
    typeof raw.replyToId === "string" && raw.replyToId.trim() ? raw.replyToId.trim() : null;
  if (!body && !gifUrl) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const db = getDb();
  const blocked = await blockIfCannotInteract(db, payload.userId);
  if (blocked) return Response.json({ error: blocked.error }, { status: blocked.status });

  await maybeSweepChatMessages(db);

  if (replyToId) {
    const cutoff = getChatCutoffDate();
    const [parent] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(and(eq(chatMessages.id, replyToId), gt(chatMessages.createdAt, cutoff)))
      .limit(1);
    if (!parent) {
      return Response.json({ error: "Reply target not found" }, { status: 400 });
    }
  }

  const [row] = await db
    .insert(chatMessages)
    .values({
      userId: payload.userId,
      body: encryptStoredMessage(body || ""),
      gifUrl,
      replyToId,
    })
    .returning({
      id: chatMessages.id,
      body: chatMessages.body,
      gifUrl: chatMessages.gifUrl,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
      userId: chatMessages.userId,
      replyToId: chatMessages.replyToId,
    });

  const [user] = await db
    .select({
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
      discordBoosting: users.discordBoosting,
    })
    .from(users)
    .leftJoin(roles, eq(roles.name, users.role))
    .where(eq(users.id, payload.userId))
    .limit(1);

  let replyUsername: string | null = null;
  let replyGifUrl: string | null = null;
  let replyBodyRaw: string | null = null;

  if (replyToId) {
    const [replyRow] = await baseMessageQuery(db)
      .where(eq(chatMessages.id, replyToId))
      .limit(1);

    if (replyRow) {
      replyUsername = replyRow.replyUsername;
      replyGifUrl = replyRow.replyGifUrl;
      replyBodyRaw = replyRow.replyBody;
    }
  }

  const [message] = await enrichMessages([
    {
      ...row,
      body: body || "",
      username: user?.username ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      role: user?.role ?? "user",
      roleColor: user?.roleColor ?? null,
      discordBoosting: user?.discordBoosting ?? false,
      replyToId: row.replyToId,
      replyBody: replyBodyRaw,
      replyGifUrl,
      replyUsername,
    },
  ]);

  return Response.json({ message }, { status: 201 });
}
