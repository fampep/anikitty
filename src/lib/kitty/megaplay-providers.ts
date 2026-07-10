/** KittyAPI unified MegaPlay provider (replaces scrape-based Anikoto, AnimeSogo, Anix, HiAnime, Animepahe). */
export const MEGAPLAY_PROVIDER_ID = "MegaPlay" as const;

/** Internal KittyAPI backends merged behind the single MegaPlay provider. */
export const MEGAPLAY_BACKENDS = [
  "Anikoto",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

/** Saved `kittyProvider` values from before the unified provider — map to {@link MEGAPLAY_PROVIDER_ID}. */
export const LEGACY_MEGAPLAY_PROVIDER_IDS = MEGAPLAY_BACKENDS;

export type LegacyMegaplayProviderId = (typeof LEGACY_MEGAPLAY_PROVIDER_IDS)[number];

export type MegaplayProviderConfig = {
  id: typeof MEGAPLAY_PROVIDER_ID;
  slug: string;
  /** Merged search across {@link MEGAPLAY_BACKENDS}; `anilist:` routes to Anikoto API catalog. */
  catalogApi: string;
  streamApi: string;
  hint: string;
};

/** Mirrors KittyAPI `MegaPlayProvider` — merged backends, URL-routed episodes/servers/stream. */
export const MEGAPLAY_PROVIDER_CONFIG: MegaplayProviderConfig = {
  id: "MegaPlay",
  slug: "megaplay",
  catalogApi: "anikotoapi.site",
  streamApi: "megaplay.buzz",
  hint: "Anikoto · AnimeSogo · Anix · HiAnime · Animepahe · 1080p/720p/360p · SUB · DUB · VTT",
};

const LEGACY_MEGAPLAY_SET = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export function isLegacyMegaplayProvider(provider: string): provider is LegacyMegaplayProviderId {
  return LEGACY_MEGAPLAY_SET.has(provider);
}

export function isMegaplayProvider(provider: string): boolean {
  return provider === MEGAPLAY_PROVIDER_ID || isLegacyMegaplayProvider(provider);
}
