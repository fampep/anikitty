import {
  MEGAPLAY_FAMILY_PROVIDERS,
  MEGAPLAY_PROVIDER_CONFIG,
} from "@/lib/kitty/megaplay-providers";

export const KITTY_PROVIDERS = [
  "Miruro",
  "Animex",
  "Animo",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "AniWatch",
  "AniSnatch",
  "Lunar",
  "Animepahe",
  "Anikoto",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
  "AnimeHub",
  "ReAnime",
  "2Dhive",
  "KaaLt",
  "AllAnime",
  "MKissa",
  "Senshi",
  "Animetsu",
  "Animeverse",
  "AniZone",
  "AnimeGG",
  "AniDB",
  "AniBD",
  "Nyanime",
  "AnimeOnsen",
  "AnimeNexus",
  "Animeya",
  "Anizen",
  "AniWaves",
  "AnimaxAnime",
] as const;

export type KittyProvider = (typeof KITTY_PROVIDERS)[number];

export type KittyProviderGroup = "featured" | "subs" | "other";

export type KittyProviderMeta = {
  id: KittyProvider;
  label: string;
  group: KittyProviderGroup;
  /** Japanese audio (`audio=sub`). Episode-dependent; true = provider supports it in general. */
  supportsSub?: boolean;
  /** English dub (`audio=dub`). Episode-dependent; true = provider supports it in general. */
  supportsDub?: boolean;
  /** Soft subtitles in stream-direct `tracks[]` when available. */
  softSub?: boolean;
  /** Burned-in subs or dedicated hard-sub server lines (e.g. MegaPlay `HS:`). */
  hardSub?: boolean;
  /** Player embed keeps subtitle tracks from stream-direct. */
  nativeSubs?: boolean;
  /** Kitty `GET /subs` endpoint supports this provider. */
  kittySubs?: boolean;
  /** Dual-audio / in-player HLS track switch (Miruro pipes, Animex Zen, etc.). */
  supportsMulti?: boolean;
  hint?: string;
};

export type ProviderAudioMode = "sub" | "dub" | "hardsub" | "multi";

export const KITTY_PROVIDER_META: KittyProviderMeta[] = [
  {
    id: "Miruro",
    label: "Miruro",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    supportsMulti: true,
    hint: "sub · ssub · dub pipes · soft VTT/ASS · some hard-sub embeds",
  },
  {
    id: "Animex",
    label: "Animex",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "Zen · Koto · Beep · Mimi · Yuki · Uwu · Mochi · Neko · Sax · Yume · Kiwi · soft subs on SUB only",
  },
  {
    id: "Animo",
    label: "Animo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "4animo.xyz · HD-1 / HD-2 / HD-3 · SUB · DUB · /subs",
  },
  {
    id: "AnimeSogo",
    label: "AnimeSogo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: MEGAPLAY_PROVIDER_CONFIG.AnimeSogo.hint,
  },
  {
    id: "Anix",
    label: "Anix",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: MEGAPLAY_PROVIDER_CONFIG.Anix.hint,
  },
  {
    id: "HiAnime",
    label: "HiAnime",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: MEGAPLAY_PROVIDER_CONFIG.HiAnime.hint,
  },
  {
    id: "AniWatch",
    label: "AniWatch",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "aniwatch.one · MGCLD · BYFMS · DGHG · MegaCloud · soft subs on SUB · /subs",
  },
  {
    id: "AniSnatch",
    label: "AniSnatch",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    supportsMulti: true,
    hint: "AniVibe · Kwik · AniBD · Megaplay · soft-sub servers on site · SUB · DUB",
  },
  {
    id: "Lunar",
    label: "Lunar",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    supportsMulti: true,
    hint: "lunaranime.ru · Beep · Mimi · Yuki · Miku · Vee · FlixCloud · Vermillion subs",
  },
  {
    id: "AllAnime",
    label: "AllAnime",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "allmanga.to · search is dub-mode-specific · SUB · DUB · soft subs on SUB",
  },
  {
    id: "MKissa",
    label: "MKissa",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "mkissa.to · AllAnime API · audio selects mode · subs vary by mirror",
  },
  {
    id: "Animepahe",
    label: "Animepahe",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: MEGAPLAY_PROVIDER_CONFIG.Animepahe.hint,
  },
  {
    id: "Anikoto",
    label: "Anikoto",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: MEGAPLAY_PROVIDER_CONFIG.Anikoto.hint,
  },
  {
    id: "AnimeHub",
    label: "AnimeHub",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "Separate AniList slugs per audio · SUB · DUB · soft subs",
  },
  {
    id: "ReAnime",
    label: "ReAnime",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    hardSub: true,
    hint: "reanime.to · FlixCloud · SUB · DUB · no tracks[] · subs may be burned in",
  },
  {
    id: "2Dhive",
    label: "2Dhive",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    hint: "MegaPlay · hiAnime HLS · HAdfree MP4 · soft/hard sub depends on server",
  },
  {
    id: "Anitaku",
    label: "Anitaku",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · VTT on SUB · site HSUB tab not in API server list",
  },
  {
    id: "Anikage",
    label: "Anikage",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    hint: "MIKO · VERSE · NEKO · language filter · SUB · DUB",
  },
  {
    id: "AnimeHeaven",
    label: "AnimeHeaven",
    group: "other",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    hint: "SUB only · soft subs",
  },
  {
    id: "KaaLt",
    label: "KaaLt",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    hint: "AnimeKai · VidStreaming · CatStream · SUB · DUB",
  },
  {
    id: "Senshi",
    label: "Senshi",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "sub · softsub · hardsub · dub source tags",
  },
  {
    id: "Animetsu",
    label: "Animetsu",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "KITE · DIO · MEG · SAGE · SUB · DUB · /subs",
  },
  {
    id: "Animeverse",
    label: "Animeverse",
    group: "other",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB only · soft subs · MegaPlay fallback",
  },
  {
    id: "AniZone",
    label: "AniZone",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "AnimeGG",
    label: "AnimeGG",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    hint: "GG-SUB · GG-DUB server tabs · soft subs",
  },
  {
    id: "AniDB",
    label: "AniDB",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    hint: "jpn vs eng audio · SUB · DUB · soft subs",
  },
  {
    id: "AniBD",
    label: "AniBD",
    group: "other",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    hint: "PlayEng SR streams · SUB only · ASS/SRT when present",
  },
  {
    id: "Nyanime",
    label: "Nyanime",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "Per-episode hasSub / hasDub · soft subs",
  },
  {
    id: "AnimeOnsen",
    label: "AnimeOnsen",
    group: "other",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "DASH · SUB only · parsed subtitle tracks",
  },
  {
    id: "AnimeNexus",
    label: "AnimeNexus",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "DUB needs English audio on episode · HLS + m3u8 subs",
  },
  {
    id: "Animeya",
    label: "Animeya",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "ENG vs JPN locale streams · SUB · DUB",
  },
  {
    id: "Anizen",
    label: "Anizen",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "MegaPlay · Ryzex · Abyss · SUB · DUB · Hindi · VTT on SUB · /subs",
  },
  {
    id: "AniWaves",
    label: "AniWaves",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "sub + ssub + dub servers · VTT/ASS on SUB · some ssub in-stream",
  },
  {
    id: "AnimaxAnime",
    label: "Animax",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    // AniList-native; servers return muxed/hardsubbed streams with no soft tracks.
    softSub: false,
    nativeSubs: false,
    kittySubs: false,
    hint: "animaxanime.dpdns.org · AniList-native · Anineko · AllManga · Animegg · Crunchyroll · SUB · DUB · burned-in subs",
  },
];

/** Preferred providers — the first is what loads by default, and auto-fallback
 * tries these before anything else. */
export const DEFAULT_PROVIDER_PRIORITY: KittyProvider[] = [
  "Anix",
  "HiAnime",
  "Animepahe",
  "Animex",
];

export const DEFAULT_KITTY_PROVIDER: KittyProvider = DEFAULT_PROVIDER_PRIORITY[0];

const DEPRECATED_PROVIDERS = new Set([
  "AnimeParadise",
  "AniNeko",
  "AnimeStream",
  "AniDao",
  "AnimeLibre",
  "AniVerse",
  "KimoiTV",
  "PimpAnime",
]);

/** MegaPlay family — Anikoto, AnimeSogo, Anix, HiAnime, Animepahe (KittyAPI shared provider). */
export const KITTY_MEGAPLAY_PROVIDERS = new Set<KittyProvider>(
  MEGAPLAY_FAMILY_PROVIDERS as unknown as KittyProvider[],
);

export {
  MEGAPLAY_FAMILY_PROVIDERS,
  MEGAPLAY_PROVIDER_CONFIG,
  isMegaplayFamilyProvider,
} from "@/lib/kitty/megaplay-providers";

/** Providers whose stream-direct embed tracks are kept in the player (soft subs in `tracks[]`). */
export const KITTY_NATIVE_SUB_PROVIDERS = new Set<KittyProvider>([
  ...MEGAPLAY_FAMILY_PROVIDERS,
  "Animo",
  "Miruro",
  "Animex",
  "AllAnime",
  "MKissa",
  "AnimeHub",
  "AniWatch",
  "Lunar",
  "2Dhive",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
  "KaaLt",
  "Senshi",
  "Animetsu",
  "Animeverse",
  "AniZone",
  "AnimeGG",
  "AniDB",
  "AniBD",
  "Nyanime",
  "AnimeOnsen",
  "AnimeNexus",
  "Animeya",
  "Anizen",
  "AniWaves",
  "AniSnatch",
]);

export function isKittyProvider(value: string): value is KittyProvider {
  return (KITTY_PROVIDERS as readonly string[]).includes(value);
}

export function normalizeKittyProvider(value: string | null | undefined): KittyProvider {
  if (value && isKittyProvider(value)) return value;
  if (value && DEPRECATED_PROVIDERS.has(value)) return DEFAULT_KITTY_PROVIDER;
  return DEFAULT_KITTY_PROVIDER;
}

export function getKittyProviderMeta(id: KittyProvider): KittyProviderMeta {
  return KITTY_PROVIDER_META.find((p) => p.id === id) ?? { id, label: id, group: "other" };
}

export function kittyProvidersByGroup(group: KittyProviderGroup): KittyProviderMeta[] {
  return KITTY_PROVIDER_META.filter((p) => p.group === group);
}

export function providerHasNativeSubs(provider: KittyProvider): boolean {
  return KITTY_NATIVE_SUB_PROVIDERS.has(provider);
}

export function providerHasKittySubs(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).kittySubs === true;
}

export function providerSupportsDub(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).supportsDub === true;
}

export function providerSupportsSub(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).supportsSub !== false;
}

export function providerHasSoftSub(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).softSub === true;
}

export function providerHasHardSub(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).hardSub === true;
}

export function providerSupportsMulti(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).supportsMulti === true;
}

/** Providers that only appear in the MULTI row (server picker expands below). */
export const MULTI_ROW_PROVIDERS = new Set<KittyProvider>([
  "Miruro",
  "Animex",
  "AniSnatch",
  "Lunar",
  "AllAnime",
  "MKissa",
]);

export function kittyProvidersForAudioMode(mode: ProviderAudioMode): KittyProviderMeta[] {
  return KITTY_PROVIDER_META.filter((p) => {
    if (mode === "multi") return p.supportsMulti === true;
    if (MULTI_ROW_PROVIDERS.has(p.id)) return false;
    if (mode === "dub") return p.supportsDub === true;
    if (mode === "hardsub") return p.hardSub === true;
    if (mode === "sub") return p.supportsSub === true;
    return false;
  });
}
