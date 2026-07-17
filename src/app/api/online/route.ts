import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  getOnlineCount,
  leaveOnlinePresence,
  touchOnlinePresence,
} from "@/lib/online/presence-store";
import { eq } from "drizzle-orm";

const userPingAt = new Map<string, number>();
const USER_PING_THROTTLE_MS = 45_000;

function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64;
}

async function touchUserPresence(userId: string) {
  if (!process.env.DATABASE_URL) return;

  const now = Date.now();
  const last = userPingAt.get(userId) ?? 0;
  if (now - last < USER_PING_THROTTLE_MS) return;
  userPingAt.set(userId, now);

  try {
    const db = getDb();
    await db
      .update(users)
      .set({ lastOnlineAt: new Date() })
      .where(eq(users.id, userId));
  } catch {
    /* ignore */
  }
}

async function resolveUserId(req: Request): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

export async function GET() {
  const count = await getOnlineCount();
  return Response.json({ count });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, action } = (body ?? {}) as {
      sessionId?: unknown;
      action?: unknown;
    };

    const visitorId = isValidVisitorId(sessionId) ? sessionId : null;
    const userId = await resolveUserId(req);

    if (action === "leave") {
      const count = visitorId
        ? await leaveOnlinePresence(visitorId, userId)
        : await getOnlineCount();
      return Response.json({ count });
    }

    if (!visitorId) {
      return Response.json({ count: await getOnlineCount() });
    }

    if (userId) {
      await touchUserPresence(userId);
    }

    const count = await touchOnlinePresence(visitorId, userId);
    return Response.json({ count });
  } catch {
    return Response.json({ count: await getOnlineCount() });
  }
}
