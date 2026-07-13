export const BOOSTER_ROLE = "booster";

export function getDiscordBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN?.trim() || null;
}

export function getDiscordGuildId(): string | null {
  return process.env.DISCORD_GUILD_ID?.trim() || null;
}

export function getDiscordBotApiSecret(): string | null {
  return process.env.DISCORD_BOT_API_SECRET?.trim() || null;
}

export function isDiscordBotConfigured(): boolean {
  return !!(getDiscordBotToken() && getDiscordGuildId() && getDiscordBotApiSecret());
}

export function getInternalApiBaseUrl(): string {
  const port = process.env.PORT?.trim() || "3000";
  const explicit = process.env.INTERNAL_API_URL?.trim();

  if (explicit) {
    const normalized = explicit.replace(/\/$/, "");
    try {
      const url = new URL(normalized);
      const isLocal =
        url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "::1";
      if (isLocal && url.port && url.port !== port) {
        return `http://127.0.0.1:${port}`;
      }
    } catch {
      // use explicit below
    }
    return normalized;
  }

  return `http://127.0.0.1:${port}`;
}

export function getDiscordBoosterRoleId(): string | null {
  return process.env.DISCORD_BOOSTER_ROLE_ID?.trim() || null;
}
