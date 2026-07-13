import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { STAFF_ROLES, DONATOR_ROLE } from "@/lib/social/donation-config";
import { BOOSTER_ROLE } from "@/lib/discord/bot-config";
import { findUserByDiscordId } from "@/lib/discord/discord-link";

type Db = ReturnType<typeof getDb>;

export type DiscordBoostSyncResult =
  | { ok: true; username: string; role: string; boosting: boolean }
  | { ok: false; reason: "not_linked" };

function shouldKeepExistingRole(role: string): boolean {
  return STAFF_ROLES.has(role) || role === DONATOR_ROLE || role === "timestamp_helper";
}

export async function syncDiscordBoostStatus(
  db: Db,
  discordId: string,
  boosting: boolean,
): Promise<DiscordBoostSyncResult> {
  const user = await findUserByDiscordId(db, discordId);
  if (!user) return { ok: false, reason: "not_linked" };

  if (boosting) {
    const updates: Partial<typeof users.$inferInsert> = {
      discordBoostSince: user.discordBoostSince ?? new Date(),
    };
    if (user.role === "user") {
      updates.role = BOOSTER_ROLE;
    }
    await db.update(users).set(updates).where(eq(users.id, user.id));
    const role = shouldKeepExistingRole(user.role) ? user.role : BOOSTER_ROLE;
    return { ok: true, username: user.username, role, boosting: true };
  }

  const updates: Partial<typeof users.$inferInsert> = {
    discordBoostSince: null,
  };
  if (user.role === BOOSTER_ROLE) {
    updates.role = "user";
  }
  await db.update(users).set(updates).where(eq(users.id, user.id));
  const role = user.role === BOOSTER_ROLE ? "user" : user.role;
  return { ok: true, username: user.username, role, boosting: false };
}
