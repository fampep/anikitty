import type { getDb } from "@/db";
import { userBlocks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

/** User ids the viewer has blocked (their comments/contact are hidden). */
export async function getBlockedUserIds(db: Db, viewerId: string): Promise<string[]> {
  const rows = await db
    .select({ blockedId: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, viewerId));
  return rows.map((r) => r.blockedId);
}

/** True if `blockerId` has blocked `blockedId` (directional). */
export async function hasBlocked(db: Db, blockerId: string, blockedId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)))
    .limit(1);
  return !!row;
}

/** True if either user has blocked the other — used to gate contact. */
export async function blockExistsBetween(db: Db, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
        and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
      ),
    )
    .limit(1);
  return !!row;
}
