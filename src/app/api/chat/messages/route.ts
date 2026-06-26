import { getDb } from "@/db";
import { chatMessages, users, roles } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { sanitizeBody, sanitizeGifUrl, rateLimit, maybeSweep } from "@/lib/comment-helpers";
import { attachLevelRole, getUsersXpStats } from "@/lib/user-xp";
import { eq, desc, gt, asc } from "drizzle-orm";

const PAGE_LIMIT = 100;
const CHAT_RATE = { windowMs: 30_000, max: 15 } as const;

const MESSAGE_SELECT = {
  id: chatMessages.id,
  body: chatMessages.body,
  gifUrl: chatMessages.gifUrl,
  createdAt: chatMessages.createdAt,
  userId: chatMessages.userId,
  username: users.username,
  avatarUrl: users.avatarUrl,
  role: users.role,
  roleColor: roles.color,
} as const;

async function enrichMessages(
  rows: {
    id: string;
    body: string;
    gifUrl: string | null;
    createdAt: Date | null;
    userId: string;
    username: string;
    avatarUrl: string | null;
    role: string;
    roleColor: string | null;
  }[],
) {
  const db = getDb();
  const xpStatsMap = await getUsersXpStats(db, rows.map((r) => r.userId));
  return rows.map((r) => {
    const enriched = attachLevelRole(r, xpStatsMap);
    return {
      ...enriched,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(
    PAGE_LIMIT,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(PAGE_LIMIT))),
  );

  const db = getDb();

  if (after) {
    const afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return Response.json({ error: "Invalid after timestamp" }, { status: 400 });
    }

    const rows = await db
      .select(MESSAGE_SELECT)
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.userId))
      .leftJoin(roles, eq(roles.name, users.role))
      .where(gt(chatMessages.createdAt, afterDate))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limit);

    const messages = await enrichMessages(rows);
    return Response.json({ messages });
  }

  const rows = await db
    .select(MESSAGE_SELECT)
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  rows.reverse();
  const messages = await enrichMessages(rows);
  return Response.json({ messages });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  maybeSweep();
  if (!rateLimit(`chat:${payload.userId}`, CHAT_RATE)) {
    return Response.json({ error: "Slow down" }, { status: 429 });
  }

  const raw = await req.json();
  const body = sanitizeBody(raw.body);
  const gifUrl = sanitizeGifUrl(raw.gifUrl);
  if (!body && !gifUrl) {
    return Response.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const db = getDb();

  const [row] = await db
    .insert(chatMessages)
    .values({ userId: payload.userId, body: body || "", gifUrl })
    .returning({
      id: chatMessages.id,
      body: chatMessages.body,
      gifUrl: chatMessages.gifUrl,
      createdAt: chatMessages.createdAt,
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

  const [message] = await enrichMessages([
    {
      ...row,
      username: user?.username ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      role: user?.role ?? "user",
      roleColor: user?.roleColor ?? null,
    },
  ]);

  return Response.json({ message }, { status: 201 });
}
