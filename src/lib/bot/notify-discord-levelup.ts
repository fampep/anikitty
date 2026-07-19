import { getBotApiSecret } from "@/lib/bot/authorize-bot";
import { getDiscordBotLevelUpUrl } from "@/lib/bot/discord-bot-webhook";
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

export function notifyDiscordLevelUp(payload: DiscordLevelUpPayload): void {
  const url = getDiscordBotLevelUpUrl();
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
  }).catch((err) => {
    console.error("[discord-levelup] webhook failed:", err);
  });
}

/**
 * After XP-granting writes: if the user's level rose past the last announced
 * level and they have Discord linked, push a level-up webhook to the bot.
 * First sighting bootstraps without announcing (avoids spam on deploy/link).
 * Uses the same `getUserXpStats` total (watch + comments + Discord chat XP).
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
