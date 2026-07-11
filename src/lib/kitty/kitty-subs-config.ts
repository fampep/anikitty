/** User-facing label for cached / proxied subtitle tracks (not upstream provider names). */
export const ANIKITTY_SUBTITLE_PROXY_LABEL = "Anikitty proxy";

/** Stored in Postgres — maps to {@link ANIKITTY_SUBTITLE_PROXY_LABEL} in the UI. */
export const KITTY_SUB_SOURCE_PROVIDER = "KittySubs";

/**
 * Fallback order when GET /subs?list=providers is unavailable.
 * Providers with Kitty `/subs` support per KittyAPI reference.
 */
export const KITTY_SUB_PROVIDERS_FALLBACK = [
  "MegaPlay",
  "Anitaku",
  "AniNeko",
] as const;

export type KittySubProvider = (typeof KITTY_SUB_PROVIDERS_FALLBACK)[number];

/** @deprecated Use KITTY_SUB_PROVIDERS_FALLBACK */
export const KITTY_SUB_PROVIDERS = KITTY_SUB_PROVIDERS_FALLBACK;
