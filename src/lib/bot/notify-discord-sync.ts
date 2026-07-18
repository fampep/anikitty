import { getBotApiSecret } from "@/lib/bot/authorize-bot";

/**
 * Optional fire-and-forget ping so the Discord bot can sync roles immediately
 * after a site role change. Configure `DISCORD_BOT_SYNC_URL` on the site
 * (e.g. `http://discord-bot:8787/sync`) and the same `BOT_API_SECRET`.
 */
export function notifyDiscordRoleSync(reason?: string): void {
  const url = process.env.DISCORD_BOT_SYNC_URL?.trim();
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
  }).catch(() => {
    /* ignore — scheduled sync is the fallback */
  });
}
