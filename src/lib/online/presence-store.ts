import { sql } from "drizzle-orm";
import { getDb, rowsOf } from "@/db";

/** Heartbeats older than this are not counted as online. */
export const ONLINE_TTL_MS = 90_000;

/** Delete rows older than this on opportunistic prune. */
const PRUNE_AFTER_MS = 5 * 60_000;

type MemorySessions = Map<string, { at: number; userId: string | null }>;

const globalForPresence = globalThis as unknown as {
  __anikittyOnlineSessions?: MemorySessions;
  __anikittyOnlinePruneAt?: number;
};

function memorySessions(): MemorySessions {
  if (!globalForPresence.__anikittyOnlineSessions) {
    globalForPresence.__anikittyOnlineSessions = new Map();
  }
  return globalForPresence.__anikittyOnlineSessions;
}

function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Unique presence key: signed-in users share one key across tabs; guests use visitor id. */
export function resolveVisitorKey(visitorId: string, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  return `g:${visitorId}`;
}

function sanitizeCount(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

function pruneMemory(now = Date.now()) {
  const sessions = memorySessions();
  for (const [key, entry] of sessions) {
    if (now - entry.at > ONLINE_TTL_MS) sessions.delete(key);
  }
}

function countMemory(now = Date.now()): number {
  pruneMemory(now);
  return memorySessions().size;
}

function touchMemory(key: string, userId: string | null) {
  memorySessions().set(key, { at: Date.now(), userId });
}

function leaveMemory(key: string) {
  memorySessions().delete(key);
}

async function pruneDb() {
  const now = Date.now();
  const last = globalForPresence.__anikittyOnlinePruneAt ?? 0;
  if (now - last < 60_000) return;
  globalForPresence.__anikittyOnlinePruneAt = now;

  const cutoff = new Date(now - PRUNE_AFTER_MS);
  const db = getDb();
  await db.execute(sql`
    DELETE FROM online_visitors
    WHERE last_seen_at < ${cutoff}
  `).catch(() => {});
}

async function countDb(): Promise<number> {
  const cutoff = new Date(Date.now() - ONLINE_TTL_MS);
  const db = getDb();
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM online_visitors
    WHERE last_seen_at > ${cutoff}
  `);
  const row = rowsOf<{ count: number }>(result)[0];
  return sanitizeCount(row?.count);
}

async function touchDb(key: string, userId: string | null) {
  const db = getDb();
  await db.execute(sql`
    INSERT INTO online_visitors (visitor_key, last_seen_at, user_id)
    VALUES (${key}, NOW(), ${userId})
    ON CONFLICT (visitor_key) DO UPDATE SET
      last_seen_at = NOW(),
      user_id = EXCLUDED.user_id
  `);
  await pruneDb();
}

async function leaveDb(key: string) {
  const db = getDb();
  await db.execute(sql`
    DELETE FROM online_visitors WHERE visitor_key = ${key}
  `);
}

/** Current online visitor count (never invents a fake 1). */
export async function getOnlineCount(): Promise<number> {
  if (!hasDatabase()) return countMemory();
  try {
    return await countDb();
  } catch {
    return countMemory();
  }
}

export async function touchOnlinePresence(
  visitorId: string,
  userId?: string | null,
): Promise<number> {
  const key = resolveVisitorKey(visitorId, userId);
  if (!hasDatabase()) {
    touchMemory(key, userId ?? null);
    return countMemory();
  }
  try {
    await touchDb(key, userId ?? null);
    return await countDb();
  } catch {
    touchMemory(key, userId ?? null);
    return countMemory();
  }
}

export async function leaveOnlinePresence(
  visitorId: string,
  userId?: string | null,
): Promise<number> {
  const key = resolveVisitorKey(visitorId, userId);
  // Also drop the guest key when a signed-in leave arrives, in case login
  // happened mid-session and both keys briefly existed.
  const guestKey = resolveVisitorKey(visitorId, null);

  if (!hasDatabase()) {
    leaveMemory(key);
    if (guestKey !== key) leaveMemory(guestKey);
    return countMemory();
  }
  try {
    await leaveDb(key);
    if (guestKey !== key) await leaveDb(guestKey);
    return await countDb();
  } catch {
    leaveMemory(key);
    if (guestKey !== key) leaveMemory(guestKey);
    return countMemory();
  }
}
