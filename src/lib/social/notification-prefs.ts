import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { sanitizeSyncedPreferences } from "@/lib/account/user-preferences";
import { inArray } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type NotificationPrefs = {
  mentions: boolean;
  replies: boolean;
  follows: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = { mentions: true, replies: true, follows: true };

function toPrefs(raw: unknown): NotificationPrefs {
  const p = sanitizeSyncedPreferences(raw);
  return {
    mentions: p.notifyMentions ?? true,
    replies: p.notifyReplies ?? true,
    follows: p.notifyFollows ?? true,
  };
}

/** Notification prefs for one user (defaults to all-on). */
export async function getNotificationPrefs(db: Db, userId: string): Promise<NotificationPrefs> {
  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(inArray(users.id, [userId]))
    .limit(1);
  return row ? toPrefs(row.preferences) : DEFAULT_PREFS;
}

/** Batch lookup keyed by userId (missing users default to all-on). */
export async function getNotificationPrefsFor(
  db: Db,
  userIds: string[],
): Promise<Map<string, NotificationPrefs>> {
  const map = new Map<string, NotificationPrefs>();
  if (userIds.length === 0) return map;
  const rows = await db
    .select({ id: users.id, preferences: users.preferences })
    .from(users)
    .where(inArray(users.id, userIds));
  for (const r of rows) map.set(r.id, toPrefs(r.preferences));
  return map;
}
