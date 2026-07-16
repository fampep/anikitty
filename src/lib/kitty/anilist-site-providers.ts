/** KittyAPI providers that resolve catalog via AniList ID + anichi.to scrape. */
export const ANILIST_SITE_PROVIDER_IDS = ["MegaPlay", "Anikoto"] as const;

export type AnilistSiteProviderId = (typeof ANILIST_SITE_PROVIDER_IDS)[number];

export const MEGAPLAY_PROVIDER_ID = "MegaPlay" as const;
export const ANIKOTO_PROVIDER_ID = "Anikoto" as const;

/** Saved provider ids from before MegaPlay unification — map to MegaPlay at runtime. */
export const LEGACY_MEGAPLAY_PROVIDER_IDS = [
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type LegacyMegaplayProviderId = (typeof LEGACY_MEGAPLAY_PROVIDER_IDS)[number];

export type MegaplayProviderConfig = {
  id: typeof MEGAPLAY_PROVIDER_ID;
  slug: string;
  hint: string;
};

/** MegaPlay: AniList ID only — KittyAPI delegates to Anikoto site scrape. */
export const MEGAPLAY_PROVIDER_CONFIG: MegaplayProviderConfig = {
  id: "MegaPlay",
  slug: "megaplay",
  hint: "AniList ID · anichi.to scrape · SUB · DUB · HS: hard-sub",
};

const LEGACY_MEGAPLAY_SET = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export function isLegacyMegaplayProvider(provider: string): provider is LegacyMegaplayProviderId {
  return LEGACY_MEGAPLAY_SET.has(provider);
}

export function isMegaplayProvider(provider: string): boolean {
  return provider === MEGAPLAY_PROVIDER_ID || isLegacyMegaplayProvider(provider);
}

export function isAnikotoProvider(provider: string): boolean {
  return provider === ANIKOTO_PROVIDER_ID;
}

/** MegaPlay or Anikoto — both use `anilist:{id}` and stream-direct. */
export function isAnilistSiteProvider(provider: string): provider is AnilistSiteProviderId {
  return provider === MEGAPLAY_PROVIDER_ID || provider === ANIKOTO_PROVIDER_ID;
}

/** `seriesUrl` for `/episodes` — AniList IDs only (not MAL). */
export function anilistSiteSeriesUrl(anilistId: number): `anilist:${number}` {
  return `anilist:${anilistId}`;
}

/** Hard-sub server lines from anichi.to scrape (`HS: VidPlay-1`, etc.). */
export function isHardSubServerName(name: string): boolean {
  return /^HS:\s*/i.test(name.trim());
}
