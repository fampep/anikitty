import { getBotApiSecret } from "@/lib/bot/authorize-bot";
import { getDiscordBotSyncUrl } from "@/lib/bot/discord-bot-webhook";

/**
 * Fire-and-forget ping so the Discord bot can sync roles immediately after a
 * site role change. Uses `DISCORD_BOT_SYNC_URL` or `http://discord-bot:8787/sync`.
 */
export function notifyDiscordRoleSync(reason?: string): void {
  const url = getDiscordBotSyncUrl();
  const secret = getBotApiSecret();
  if (!url || !secret) return;

  void fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: reason ?? "role_change" }),
    signal: AbortSignal.timeout(5_000),
  }).catch((err) => {
    console.error("[discord-sync] webhook failed:", err);
  });
}
