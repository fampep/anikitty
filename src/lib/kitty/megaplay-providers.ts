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

export type MegaplayProviderConfig = {
  id: typeof MEGAPLAY_PROVIDER_ID;
  slug: string;
  catalogApi: string;
  streamApi: string;
  hint: string;
};

/** Mirrors KittyAPI `MegaPlayProvider` — Anikoto API catalog + MegaPlay stream API. */
export const MEGAPLAY_PROVIDER_CONFIG: MegaplayProviderConfig = {
  id: "MegaPlay",
  slug: "megaplay",
  catalogApi: "anikotoapi.site",
  streamApi: "megaplay.buzz",
  hint: "stream-direct · merged backends · 1080p/720p/360p · SUB · DUB · VTT",
};

const LEGACY_MEGAPLAY_SET = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export function isLegacyMegaplayProvider(provider: string): provider is LegacyMegaplayProviderId {
  return LEGACY_MEGAPLAY_SET.has(provider);
}

export function isMegaplayProvider(provider: string): boolean {
  return provider === MEGAPLAY_PROVIDER_ID || isLegacyMegaplayProvider(provider);
}
