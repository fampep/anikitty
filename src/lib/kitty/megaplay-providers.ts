/** KittyAPI unified MegaPlay provider (replaces scrape-based Anikoto, AnimeSogo, Anix, HiAnime, Animepahe). */
export const MEGAPLAY_PROVIDER_ID = "MegaPlay" as const;

/** Saved `kittyProvider` values from before the unified provider — map to {@link MEGAPLAY_PROVIDER_ID}. */
export const LEGACY_MEGAPLAY_PROVIDER_IDS = [
  "Anikoto",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type LegacyMegaplayProviderId = (typeof LEGACY_MEGAPLAY_PROVIDER_IDS)[number];

/** megaplay.buzz embed paths resolved by KittyAPI `resolveMegaPlayEmbed()` → getSources → HLS. */
export const MEGAPLAY_BUZZ_STREAM_PATHS = {
  /** `https://megaplay.buzz/stream/ani/{anilist}/{ep}/{sub|dub}` — built from `anilist:{id}`. */
  ani: "/stream/ani",
  /** `https://megaplay.buzz/stream/mal/{mal}/{ep}/{sub|dub}` — MAL id fallback. */
  mal: "/stream/mal",
  /** `https://megaplay.buzz/stream/s-2/{embed-id}/{sub|dub}` — when `episode_embed_id` is in dataIds. */
  s2: "/stream/s-2",
} as const;

export type MegaplayProviderConfig = {
  id: typeof MEGAPLAY_PROVIDER_ID;
  slug: string;
  /** Search maps AniList titles → `anilist:{id}` series refs. */
  catalogApi: string;
  streamApi: string;
  hint: string;
};

/** Mirrors KittyAPI `MegaPlayProvider` — megaplay.buzz embeds + stream-direct. */
export const MEGAPLAY_PROVIDER_CONFIG: MegaplayProviderConfig = {
  id: "MegaPlay",
  slug: "megaplay",
  catalogApi: "anikotoapi.site",
  streamApi: "megaplay.buzz",
  hint: "megaplay.buzz/ani · stream-direct · 1080p/720p/360p · SUB · DUB · VTT",
};

const LEGACY_MEGAPLAY_SET = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export function isLegacyMegaplayProvider(provider: string): provider is LegacyMegaplayProviderId {
  return LEGACY_MEGAPLAY_SET.has(provider);
}

export function isMegaplayProvider(provider: string): boolean {
  return provider === MEGAPLAY_PROVIDER_ID || isLegacyMegaplayProvider(provider);
}
