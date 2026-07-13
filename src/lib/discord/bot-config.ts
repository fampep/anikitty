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

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

function isUsableInternalApiUrl(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function getInternalApiBaseUrl(): string {
  const port = process.env.PORT?.trim() || "3000";
  const explicit = process.env.INTERNAL_API_URL?.trim();

  if (explicit && isUsableInternalApiUrl(explicit)) {
    const url = new URL(explicit);
    const resolvedPort = url.port || port;
    if (resolvedPort !== port) {
      return `http://127.0.0.1:${port}`;
    }
    return `http://127.0.0.1:${resolvedPort}`;
  }

  return `http://127.0.0.1:${port}`;
}
