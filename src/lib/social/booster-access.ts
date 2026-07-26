import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  BOOSTER_PROTECTED_ROLES,
  BOOSTER_ROLE,
} from "@/lib/social/booster-config";

type Db = ReturnType<typeof getDb>;

type BoostUser = {
  id: string;
  role: string;
  discordBoosting: boolean;
};

export function isBoosterRole(role?: string | null): boolean {
  return role === BOOSTER_ROLE;
}

/** Site badge / Discord sync: active Discord server boost on a linked account. */
export function hasDiscordBoosterStatus(
  discordBoosting?: boolean | null,
  role?: string | null,
): boolean {
  return !!discordBoosting || role === BOOSTER_ROLE;
}

function fallbackRoleAfterBoostLoss(user: BoostUser): string {
  if (user.role === BOOSTER_ROLE) return "user";
  return user.role;
}

function roleWhenGainingBoost(user: BoostUser): string {
  if (BOOSTER_PROTECTED_ROLES.has(user.role)) return user.role;
  if (user.role === "user" || !user.role) return BOOSTER_ROLE;
  return user.role;
}

/**
 * Mark a linked user as currently boosting the Discord server.
 * Sets `discord_boosting` and promotes `user` → `booster` when safe.
 * Does not grant Ko-fi donator rank (tip window only).
 */
export async function applyDiscordBoost(
  db: Db,
  user: BoostUser,
): Promise<{ changed: boolean; role: string; discordBoosting: boolean }> {
  const nextRole = roleWhenGainingBoost(user);
  if (user.discordBoosting && nextRole === user.role) {
    return { changed: false, role: user.role, discordBoosting: true };
  }

  await db
    .update(users)
    .set({ discordBoosting: true, role: nextRole })
    .where(eq(users.id, user.id));

  return { changed: true, role: nextRole, discordBoosting: true };
}

/**
 * Clear Discord boost status. Demotes `booster` → `user`; leaves staff/donator alone.
 */
export async function clearDiscordBoost(
  db: Db,
  user: BoostUser,
): Promise<{ changed: boolean; role: string; discordBoosting: boolean }> {
  if (!user.discordBoosting && user.role !== BOOSTER_ROLE) {
    return { changed: false, role: user.role, discordBoosting: false };
  }

  const nextRole = fallbackRoleAfterBoostLoss(user);
  await db
    .update(users)
    .set({ discordBoosting: false, role: nextRole })
    .where(eq(users.id, user.id));

  return { changed: true, role: nextRole, discordBoosting: false };
}

/**
 * After donator/tip window ends or is revoked: restore booster role if still boosting.
 */
export function roleAfterLosingDonator(discordBoosting: boolean): string {
  return discordBoosting ? BOOSTER_ROLE : "user";
}

/**
 * Sync boost state from the Discord bot for a linked snowflake.
 * Returns null when no linked user exists.
 */
export async function setDiscordBoostByDiscordId(
  db: Db,
  discordId: string,
  boosting: boolean,
): Promise<{
  userId: string;
  siteUsername: string;
  changed: boolean;
  role: string;
  discordBoosting: boolean;
} | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      discordBoosting: users.discordBoosting,
    })
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);

  if (!user) return null;

  const result = boosting
    ? await applyDiscordBoost(db, user)
    : await clearDiscordBoost(db, user);

  if (result.changed) {
    const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
    notifyDiscordRoleSync(boosting ? "discord_boost_gained" : "discord_boost_lost");
  }

  return {
    userId: user.id,
    siteUsername: user.username,
    changed: result.changed,
    role: result.role,
    discordBoosting: result.discordBoosting,
  };
}
