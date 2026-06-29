import type { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { lt } from "drizzle-orm";
import { getChatCutoffDate } from "@/lib/social/chat-config";

type Db = ReturnType<typeof getDb>;

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** Delete chat messages older than the live window (throttled). */
export async function maybeSweepChatMessages(db: Db): Promise<number> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = now;

  const cutoff = getChatCutoffDate(now);
  const deleted = await db
    .delete(chatMessages)
    .where(lt(chatMessages.createdAt, cutoff))
    .returning({ id: chatMessages.id });

  return deleted.length;
}

/** Force-delete all expired chat messages (admin / manual purge). */
export async function purgeExpiredChatMessages(db: Db): Promise<number> {
  const cutoff = getChatCutoffDate();
  const deleted = await db
    .delete(chatMessages)
    .where(lt(chatMessages.createdAt, cutoff))
    .returning({ id: chatMessages.id });
  return deleted.length;
}
