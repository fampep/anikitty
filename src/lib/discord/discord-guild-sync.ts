import { getDb } from "@/db";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord/bot-config";
import { syncDiscordBoostStatus } from "@/lib/discord/discord-boost";

type DiscordGuildMember = {
  premium_since?: string | null;
};

/** Fetch a guild member via the bot token (server-side). */
export async function fetchDiscordGuildMember(
  discordId: string,
): Promise<DiscordGuildMember | null> {
  const token = getDiscordBotToken();
  const guildId = getDiscordGuildId();
  if (!token || !guildId) return null;

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
    {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) return null;
  return res.json();
}

/** Grant site booster status when a linked user is already boosting the Discord server. */
export async function syncLinkedUserBoostFromDiscord(discordId: string): Promise<void> {
  const member = await fetchDiscordGuildMember(discordId);
  if (!member?.premium_since) return;

  const db = getDb();
  const result = await syncDiscordBoostStatus(db, discordId, true);
  if (result.ok) {
    console.info("[discord] site booster granted for linked user", result.username);
  }
}
