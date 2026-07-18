import { getBotApiSecret } from "@/lib/bot/authorize-bot";
import { levelTierDiscordKey } from "@/lib/bot/discord-sync-roles";
import { notifyDiscordRoleSync } from "@/lib/bot/notify-discord-sync";
import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getTierForLevel } from "@/lib/user/user-level";
import { getUserXpStats } from "@/lib/user/user-xp";

type Db = ReturnType<typeof getDb>;

export type DiscordLevelUpPayload = {
  discordId: string;
  username: string;
  discordUsername: string | null;
  oldLevel: number;
  newLevel: number;
  oldLevelRoleKey: string;
  oldLevelRoleName: string;
  levelRoleKey: string;
  levelRoleName: string;
  tierChanged: boolean;
};

/** Derive POST /levelup from DISCORD_BOT_LEVELUP_URL or DISCORD_BOT_SYNC_URL. */
function resolveLevelUpUrl(): string | null {
  const explicit = process.env.DISCORD_BOT_LEVELUP_URL?.trim();
  if (explicit) return explicit;

  const sync = process.env.DISCORD_BOT_SYNC_URL?.trim();
  if (!sync) return null;

  try {
    const u = new URL(sync);
    if (u.pathname === "/sync" || u.pathname.endsWith("/sync")) {
      u.pathname = u.pathname.replace(/\/sync\/?$/, "/levelup");
      return u.toString();
    }
    u.pathname = "/levelup";
    return u.toString();
  } catch {
    return sync.replace(/\/sync\/?$/, "/levelup");
  }
}

export function notifyDiscordLevelUp(payload: DiscordLevelUpPayload): void {
  const url = resolveLevelUpUrl();
  const secret = getBotApiSecret();
  if (!url || !secret) return;

  void fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => {
    /* ignore — announcements are best-effort */
  });
}

/**
 * After XP-granting writes: if the user's level rose past the last announced
 * level and they have Discord linked, push a level-up webhook to the bot.
 * First sighting bootstraps without announcing (avoids spam on deploy/link).
 */
export async function maybeAnnounceDiscordLevelUp(
  db: Db,
  userId: string,
): Promise<void> {
  try {
    const [user] = await db
      .select({
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        username: users.username,
        lastAnnounced: users.lastAnnouncedDiscordLevel,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.discordId) return;

    const stats = await getUserXpStats(db, userId);
    const newLevel = stats.level;
    const last = user.lastAnnounced;

    if (last == null) {
      await db
        .update(users)
        .set({ lastAnnouncedDiscordLevel: newLevel })
        .where(eq(users.id, userId));
      return;
    }

    if (newLevel <= last) return;

    const [claimed] = await db
      .update(users)
      .set({ lastAnnouncedDiscordLevel: newLevel })
      .where(
        and(
          eq(users.id, userId),
          eq(users.lastAnnouncedDiscordLevel, last),
        ),
      )
      .returning({ id: users.id });

    if (!claimed) return;

    const oldTier = getTierForLevel(last);
    const newTier = getTierForLevel(newLevel);
    const tierChanged = oldTier.name !== newTier.name;

    notifyDiscordLevelUp({
      discordId: user.discordId,
      username: user.username,
      discordUsername: user.discordUsername,
      oldLevel: last,
      newLevel,
      oldLevelRoleKey: levelTierDiscordKey(oldTier.name),
      oldLevelRoleName: oldTier.name,
      levelRoleKey: levelTierDiscordKey(newTier.name),
      levelRoleName: newTier.name,
      tierChanged,
    });

    if (tierChanged) {
      notifyDiscordRoleSync("level_up");
    }
  } catch (err) {
    console.error("[discord-levelup]", err);
  }
}

/** Seed last-announced level on Discord link so existing rank is not re-announced. */
export async function bootstrapDiscordLevelAnnounce(
  db: Db,
  userId: string,
): Promise<void> {
  try {
    const stats = await getUserXpStats(db, userId);
    await db
      .update(users)
      .set({ lastAnnouncedDiscordLevel: stats.level })
      .where(eq(users.id, userId));
  } catch (err) {
    console.error("[discord-levelup] bootstrap failed:", err);
  }
}
