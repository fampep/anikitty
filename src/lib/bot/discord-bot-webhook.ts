/**
 * Site → Discord bot HTTP webhooks (role sync + level-up embeds).
 *
 * Prefer Coolify runtime env; hardcoded Docker-network fallbacks match the
 * bot's SYNC_WEBHOOK_PORT (8787) so level-ups work without extra site env
 * when both services share a private network (service name `discord-bot`).
 */
const DISCORD_BOT_WEBHOOK_BASE_FALLBACK = "http://discord-bot:8787";

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

/** Absolute URL for bot `POST /sync` (immediate role sync). */
export function getDiscordBotSyncUrl(): string {
  return trimEnv("DISCORD_BOT_SYNC_URL") ?? `${DISCORD_BOT_WEBHOOK_BASE_FALLBACK}/sync`;
}

/**
 * Absolute URL for bot `POST /levelup` (channel embeds).
 * Env `DISCORD_BOT_LEVELUP_URL` wins; else derive from sync URL (`/sync` → `/levelup`).
 */
export function getDiscordBotLevelUpUrl(): string {
  const explicit = trimEnv("DISCORD_BOT_LEVELUP_URL");
  if (explicit) return explicit;

  const sync = getDiscordBotSyncUrl();
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
