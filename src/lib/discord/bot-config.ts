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
  const explicit = process.env.INTERNAL_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export function getDiscordBoosterRoleId(): string | null {
  return process.env.DISCORD_BOOSTER_ROLE_ID?.trim() || null;
}
