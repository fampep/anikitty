import packageJson from "../../package.json";

/** App version from package.json — shown in the site version badge. */
export const SITE_VERSION = packageJson.version;

export const SITE_IS_BETA = true;

/** Approximate number of anime titles in the browse catalog (marketing / landing). */
export const CATALOG_ANIME_COUNT = 6500;

export const DISCORD_INVITE_URL = "https://discord.gg/qn55BfU5Ur";

/** Public Telegram channel for AniKitty announcements. */
export const TELEGRAM_CHANNEL_URL = "https://t.me/Anikittymoe";

/** Canonical public hostnames — use these when listing legitimate AniKitty sites. */
export const OFFICIAL_DOMAINS = [
  { host: "anikitty.moe", href: "https://anikitty.moe" },
  { host: "anikitty.online", href: "https://anikitty.online" },
] as const;

/** ISO date for the FAQ & privacy page — update when content changes. */
export const FAQ_LAST_UPDATED = "2026-07-14";
