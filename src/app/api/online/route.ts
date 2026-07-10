import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";

const sessions = new Map<string, number>();
const userPingAt = new Map<string, number>();
const TTL_MS = 90_000;
const USER_PING_THROTTLE_MS = 45_000;

function prune() {
  const now = Date.now();
  for (const [id, ts] of sessions) {
    if (now - ts > TTL_MS) sessions.delete(id);
  }
}

async function touchUserPresence(userId: string) {
  const now = Date.now();
  const last = userPingAt.get(userId) ?? 0;
  if (now - last < USER_PING_THROTTLE_MS) return;
  userPingAt.set(userId, now);

  const db = getDb();
  await db
    .update(users)
    .set({ lastOnlineAt: new Date() })
    .where(eq(users.id, userId))
    .catch(() => {});
}

export async function GET() {
  prune();
  return Response.json({ count: sessions.size });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, action } = body ?? {};

    if (typeof sessionId === "string" && sessionId.length <= 64) {
      if (action === "leave") {
        sessions.delete(sessionId);
      } else {
        sessions.set(sessionId, Date.now());
      }
    }

    const token = extractToken(req);
    if (token && action !== "leave") {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        await touchUserPresence(payload.userId);
      }
    }

    prune();
    return Response.json({ count: sessions.size });
  } catch {
    prune();
    return Response.json({ count: sessions.size });
  }
}
