/** KittyAPI MegaPlay-family providers (shared scrape/stream logic in KittyAPI). */
export const MEGAPLAY_FAMILY_PROVIDERS = [
  "Anikoto",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type MegaplayFamilyProvider = (typeof MEGAPLAY_FAMILY_PROVIDERS)[number];

export type MegaplayAudioTrack = "sub" | "dub" | "hsub";

export type MegaplayProviderConfig = {
  id: MegaplayFamilyProvider;
  slug: string;
  /** AniList-backed catalog (apiMode) — episodes resolve via AniList ID + MegaPlay embeds. */
  apiMode: boolean;
  baseUrl?: string;
  mirrors?: string[];
  subGroups: MegaplayAudioTrack[];
  /** HS-prefixed server lines in the provider UI (e.g. `HS: HD-1`). */
  hsubLabel: boolean;
  knownServers: {
    sub: string[];
    dub: string[];
    hsub: string[];
  };
  /** Soft subs from stream-direct `tracks[]` on SUB responses when present. */
  softSubOnSub: boolean;
  hint: string;
};

/**
 * Per-site MegaPlay config — mirrors KittyAPI `SITE_CONFIGS` + `AnimepaheProvider`.
 * Server names match upstream `knownServers` lists.
 */
export const MEGAPLAY_PROVIDER_CONFIG: Record<MegaplayFamilyProvider, MegaplayProviderConfig> = {
  Anikoto: {
    id: "Anikoto",
    slug: "anikoto",
    apiMode: true,
    mirrors: [
      "https://anikototv.to",
      "https://anikoto.cz",
      "https://anikoto.me",
      "https://anikoto.net",
      "https://anikototv.se",
    ],
    subGroups: ["sub", "hsub"],
    hsubLabel: true,
    knownServers: {
      sub: ["VidPlay-1", "HD-1", "Vidstream-2", "VidCloud-1"],
      dub: ["HD-1", "Vidstream-2", "VidCloud-1", "VidPlay-1"],
      hsub: ["VidPlay-1", "HD-1", "Vidstream-2", "VidCloud-1"],
    },
    softSubOnSub: true,
    hint: "MegaPlay · VidPlay · HD · Vidstream · VidCloud · SUB · DUB · HS:",
  },
  AnimeSogo: {
    id: "AnimeSogo",
    slug: "animesogo",
    apiMode: true,
    baseUrl: "https://animesogo.to",
    subGroups: ["sub", "hsub"],
    hsubLabel: true,
    knownServers: {
      sub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
      dub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
      hsub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
    },
    softSubOnSub: true,
    hint: "MegaPlay · VidPlay · HD-1–3 · Vidstream · VidCloud · SUB · DUB · HS:",
  },
  Anix: {
    id: "Anix",
    slug: "anix",
    apiMode: true,
    baseUrl: "https://anixtv.me",
    subGroups: ["sub", "hsub"],
    hsubLabel: true,
    knownServers: {
      sub: ["VidPlay-1", "HD-1", "HD-2", "Vidstream-2", "VidCloud-1"],
      dub: ["VidPlay-1", "HD-1", "HD-2", "Vidstream-2", "VidCloud-1"],
      hsub: ["VidPlay-1", "HD-1", "HD-2", "Vidstream-2", "VidCloud-1"],
    },
    softSubOnSub: true,
    hint: "MegaPlay · VidPlay · HD-1/2 · Vidstream · VidCloud · SUB · DUB · HS:",
  },
  HiAnime: {
    id: "HiAnime",
    slug: "hianime",
    apiMode: true,
    baseUrl: "https://hianimez.org",
    subGroups: ["sub", "hsub"],
    hsubLabel: true,
    knownServers: {
      sub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
      dub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
      hsub: ["VidPlay-1", "HD-1", "HD-2", "HD-3", "Vidstream-2", "VidCloud-1"],
    },
    softSubOnSub: true,
    hint: "MegaPlay · VidPlay · HD-1–3 · Vidstream · VidCloud · SUB · DUB · HS:",
  },
  Animepahe: {
    id: "Animepahe",
    slug: "animepahe",
    apiMode: false,
    baseUrl: "https://animepahetv.to",
    subGroups: ["sub", "hsub"],
    hsubLabel: true,
    knownServers: {
      sub: ["Megaplay", "Vidplay"],
      dub: ["Megaplay", "Vidplay"],
      hsub: ["Megaplay", "Vidplay"],
    },
    softSubOnSub: true,
    hint: "animepahe catalog · Megaplay + Vidplay embeds · SUB · DUB · HS:",
  },
};

export const MEGAPLAY_FAMILY_SET = new Set<string>(MEGAPLAY_FAMILY_PROVIDERS);

export function isMegaplayFamilyProvider(provider: string): provider is MegaplayFamilyProvider {
  return MEGAPLAY_FAMILY_SET.has(provider);
}

export function getMegaplayProviderConfig(provider: MegaplayFamilyProvider): MegaplayProviderConfig {
  return MEGAPLAY_PROVIDER_CONFIG[provider];
}
