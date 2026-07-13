import { eq, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { users } from "@/db/schema";
import { findUserByDiscordId } from "@/lib/discord/discord-link";
import { getUserXpStats } from "@/lib/user/user-xp";
import { DISCORD_MESSAGE_XP } from "@/lib/user/user-level";

type Db = ReturnType<typeof getDb>;

export type DiscordMessageXpResult =
  | {
      ok: true;
      username: string;
      level: number;
      tier: string;
      tierColor: string;
      xpGained: number;
      leveledUp: boolean;
      tierChanged: boolean;
    }
  | { ok: false; reason: "not_linked" };

export async function awardDiscordMessageXp(
  db: Db,
  discordId: string,
): Promise<DiscordMessageXpResult> {
  const linked = await findUserByDiscordId(db, discordId);
  if (!linked) return { ok: false, reason: "not_linked" };

  const before = await getUserXpStats(db, linked.id);

  await db
    .update(users)
    .set({ discordXp: sql`${users.discordXp} + ${DISCORD_MESSAGE_XP}` })
    .where(eq(users.id, linked.id));

  const after = await getUserXpStats(db, linked.id);

  return {
    ok: true,
    username: linked.username,
    level: after.level,
    tier: after.levelRole,
    tierColor: after.levelRoleColor,
    xpGained: DISCORD_MESSAGE_XP,
    leveledUp: after.level > before.level,
    tierChanged: after.levelRole !== before.levelRole,
  };
}
