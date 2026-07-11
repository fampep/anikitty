import { getDb } from "@/db";
import { userSessions } from "@/db/schema";
import { deviceLabelFromUserAgent, maskIpAddress } from "@/lib/user/device-label";
import { getClientIp } from "@/lib/security/rate-limit";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";

const touchThrottleMs = 5 * 60 * 1000;
const lastTouch = new Map<string, number>();

// Drop entries older than the throttle window so the map doesn't grow unbounded.
let lastTouchSweep = Date.now();
function sweepLastTouch(now: number) {
  if (now - lastTouchSweep < touchThrottleMs) return;
  lastTouchSweep = now;
  for (const [id, at] of lastTouch) {
    if (now - at >= touchThrottleMs) lastTouch.delete(id);
  }
}

export type SessionRow = {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastActiveAt: Date | null;
  createdAt: Date | null;
  current: boolean;
};

export async function createSession(userId: string, req: Request) {
  const db = getDb();
  const userAgent = req.headers.get("user-agent");
  const deviceLabel = deviceLabelFromUserAgent(userAgent);
  const ipAddress = getClientIp(req);

  const [session] = await db
    .insert(userSessions)
    .values({
      userId,
      userAgent,
      deviceLabel,
      ipAddress,
    })
    .returning({ id: userSessions.id });

  return session;
}

export async function isSessionActive(sessionId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: userSessions.id })
    .from(userSessions)
    .where(and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)))
    .limit(1);

  return !!row;
}

export async function touchSession(sessionId: string) {
  const now = Date.now();
  sweepLastTouch(now);
  const prev = lastTouch.get(sessionId) ?? 0;
  if (now - prev < touchThrottleMs) return;

  lastTouch.set(sessionId, now);
  const db = getDb();
  await db
    .update(userSessions)
    .set({ lastActiveAt: new Date() })
    .where(and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)))
    .catch(() => {});
}

export async function listUserSessions(userId: string, currentSessionId?: string): Promise<SessionRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: userSessions.id,
      deviceLabel: userSessions.deviceLabel,
      ipAddress: userSessions.ipAddress,
      lastActiveAt: userSessions.lastActiveAt,
      createdAt: userSessions.createdAt,
    })
    .from(userSessions)
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))
    .orderBy(desc(userSessions.lastActiveAt));

  return rows.map((row) => ({
    id: row.id,
    deviceLabel: row.deviceLabel,
    ipAddress: maskIpAddress(row.ipAddress),
    lastActiveAt: row.lastActiveAt,
    createdAt: row.createdAt,
    current: !!currentSessionId && row.id === currentSessionId,
  }));
}

export async function revokeSessions(
  userId: string,
  sessionIds: string[],
): Promise<{ revoked: string[]; currentRevoked: boolean }> {
  if (!sessionIds.length) return { revoked: [], currentRevoked: false };

  const db = getDb();
  const now = new Date();
  const updated = await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(userSessions.userId, userId),
        inArray(userSessions.id, sessionIds),
        isNull(userSessions.revokedAt),
      ),
    )
    .returning({ id: userSessions.id });

  return {
    revoked: updated.map((r) => r.id),
    currentRevoked: false,
  };
}

export async function revokeOtherSessions(userId: string, exceptSessionId: string) {
  const db = getDb();
  const now = new Date();
  const updated = await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(userSessions.userId, userId),
        ne(userSessions.id, exceptSessionId),
        isNull(userSessions.revokedAt),
      ),
    )
    .returning({ id: userSessions.id });

  return updated.map((r) => r.id);
}

export async function revokeAllUserSessions(userId: string) {
  const db = getDb();
  const now = new Date();
  await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const db = getDb();
  const now = new Date();
  await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(
      and(eq(userSessions.userId, userId), eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)),
    );
}
