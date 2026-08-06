import {
  LEGACY_MEGAPLAY_PROVIDER_IDS,
  MEGAPLAY_PROVIDER_ID,
} from "@/lib/kitty/megaplay-providers";

/**
 * Active providers plus small alias/legacy set so saved settings still type-check.
 * Runtime selection is {@link KITTY_PROVIDERS}; aliases normalize via
 * {@link normalizeKittyProvider}.
 */
export const ALL_KITTY_PROVIDER_IDS = [
  // Active (live on KittyAPI) — site priority first
  "AniWatch",
  "AniBD",
  "Anikoto",
  "MegaVid",
  // NB: distinct from "AniKuro" (Alpha) — the ids differ by one letter.
  "UniqueStream",
  "Animeya",
  "AniVibe",
  "AniDelta",
  "Anitaku",
  "MeguAnime",
  "KickAssAnime",
  "AniKuro",
  "AniNeko",
  "Senshi",
  "AnimeGG",
  "AnimeHeaven",
  "AniHQ",
  // Normalize-only aliases / legacy (retired from picker)
  "VidNest",
  "Miruro",
  "AniWaves",
  "MKissa",
  "Animex",
  "AnimeLok",
  "Yenime",
  "AniSnatch",
  "AniDbApp",
  "KuroHost",
  "HentaiHaven",
  "Lunar",
  "FlixCloud",
  "MegaPlay",
  "AllAnime",
  "ReAnime",
  "Zenkai",
  "AniZone",
  "AnimeStream",
  "KaaLt",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type KittyProvider = (typeof ALL_KITTY_PROVIDER_IDS)[number];

/**
 * Active providers exposed on the VPS cluster. These are the only ids users can
 * select; the API paths (`/provider/{id}/…`) use these exact names.
 */
export const KITTY_PROVIDERS = [
  "AniDelta",
  "AniNeko",
  "AniVibe",
  "AniWaves",
  "Senshi",
  "MKissa",
  "AniKuro",
  "Anikoto",
  "AniSnatch",
  "KickAssAnime",
  "Miruro",
  "AnimeGG",
  "MegaVid",
  "UniqueStream",
] as const;

/** First N providers in {@link DEFAULT_PROVIDER_PRIORITY} are shown under Recommended. */
export const RECOMMENDED_PROVIDER_COUNT = 14;

/**
 * Bump when Recommended order / default must force-override saved + synced prefs.
 * Kept in sync with `settings-store` persist migrate version for provider resets.
 */
export const PROVIDER_ORDER_SYNC_VERSION = 110;

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
  /** Dual-audio / in-player HLS track switch. */
  supportsMulti?: boolean;
  /** Only offered when adult content is enabled / title is adult. */
  adultOnly?: boolean;
  hint?: string;
};

export type ProviderAudioMode = "sub" | "dub" | "hardsub" | "multi";

export const KITTY_PROVIDER_META: KittyProviderMeta[] = [
  {
    id: "AniDelta",
    label: "Delta",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: false,
    hardSub: false,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · DUB · HLS",
  },
  {
    id: "AniNeko",
    label: "Neko",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    // Serves both softsub and hardsub embeds; softsub is preferred server-side.
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · HLS",
  },
  {
    id: "AniVibe",
    label: "Vibe",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs · EarnVids/StreamHG",
  },
  {
    id: "AniWaves",
    label: "Waves",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "Senshi",
    label: "Senshi",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · HardSub / SoftSub",
  },
  {
    id: "MKissa",
    label: "Mkissa",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: false,
    hardSub: false,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · DUB · multi-mirror",
  },
  {
    id: "AniKuro",
    label: "Alpha",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "AniHQ",
    label: "HQ",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: false,
    hardSub: true,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · DUB · hard subs",
  },
  {
    id: "Anikoto",
    label: "Kilo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "AniSnatch",
    label: "Sierra",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs",
  },
  {
    // Juliet retired from Recommended/active roster — kept in repo (same treatment as AniHQ).
    id: "AniWatch",
    label: "Juliet",
    group: "other",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "KickAssAnime",
    label: "Uniform",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    supportsMulti: true,
    hint: "SUB · DUB · soft subs · dual-audio",
  },
  {
    id: "Miruro",
    label: "Echo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs · first stream wins",
  },
  {
    id: "MegaVid",
    label: "Mike",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    // stream-direct returns distinct SUB / DUB sources plus one subtitle track.
    softSub: true,
    hardSub: false,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "UniqueStream",
    label: "Unique",
    group: "featured",
    supportsSub: true,
    supportsDub: false,
    // Direct M3U8 streams via UniqueStream API
    softSub: false,
    hardSub: false,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · Direct HLS streams",
  },
  {
    id: "AnimeGG",
    label: "Golf",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: false,
    hardSub: false,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · DUB · up to 1080p",
  },
];

/** Preferred providers - the first is what loads by default, and auto-fallback
 * tries these before anything else. All fourteen are Recommended:
 * 1 Delta, 2 Echo (Miruro), 3 Mike (MegaVid), 4 Unique (UniqueStream),
 * 5 Uniform (KickAssAnime), 6 Neko, 7 Kilo, 8 Vibe, 9 Waves (AniWaves),
 * 10 Senshi, 11 Mkissa, 12 Alpha, 13 Sierra, 14 Golf (AnimeGG).
 * Juliet (AniWatch) retired from Recommended. */
export const DEFAULT_PROVIDER_PRIORITY: KittyProvider[] = [
  "AniDelta",
  "Miruro",
  "MegaVid",
  "UniqueStream",
  "KickAssAnime",
  "AniNeko",
  "Anikoto",
  "AniVibe",
  "AniWaves",
  "Senshi",
  "MKissa",
  "AniKuro",
  "AniSnatch",
  "AnimeGG",
];

/** 1-based rank in the given order (0 if missing). */
export function getKittyProviderNumber(
  id: KittyProvider,
  order?: readonly KittyProvider[] | null,
): number {
  const list = order?.length ? order : DEFAULT_PROVIDER_PRIORITY;
  const idx = list.indexOf(id);
  return idx >= 0 ? idx + 1 : 0;
}

export function isRecommendedKittyProvider(
  id: KittyProvider,
  order?: readonly KittyProvider[] | null,
): boolean {
  const n = getKittyProviderNumber(id, order);
  return n > 0 && n <= RECOMMENDED_PROVIDER_COUNT;
}

export const DEFAULT_KITTY_PROVIDER: KittyProvider = DEFAULT_PROVIDER_PRIORITY[0];

/** Soft-sub row / Soft Subs section default (overall playback default is Delta). */
export const DEFAULT_SOFT_SUB_PROVIDER: KittyProvider = "Anikoto";

/** KittyAPI unified MegaPlay provider. */
export const KITTY_MEGAPLAY_PROVIDERS = new Set<KittyProvider>([MEGAPLAY_PROVIDER_ID]);

const LEGACY_MEGAPLAY_PROVIDERS = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export {
  LEGACY_MEGAPLAY_PROVIDER_IDS,
  MEGAPLAY_PROVIDER_CONFIG,
  MEGAPLAY_PROVIDER_ID,
  isLegacyMegaplayProvider,
  isMegaplayProvider,
} from "@/lib/kitty/megaplay-providers";

/** Providers whose stream-direct embed tracks are kept in the player (soft subs in `tracks[]`). */
export const KITTY_NATIVE_SUB_PROVIDERS = new Set<KittyProvider>([
  "AniWatch",
  "AniKuro",
  "Anikoto",
  "AniSnatch",
  "AniVibe",
  "AniWaves",
  "Senshi",
  "Miruro",
  "MegaVid",
]);

/** True for any provider id AniKitty knows about (including retired ones). */
export function isKittyProvider(value: string): value is KittyProvider {
  return (ALL_KITTY_PROVIDER_IDS as readonly string[]).includes(value);
}

/** True only for providers that are currently selectable / live on the cluster. */
export function isActiveKittyProvider(value: string): value is KittyProvider {
  return (KITTY_PROVIDERS as readonly string[]).includes(value);
}

export function normalizeKittyProvider(value: string | null | undefined): KittyProvider {
  // UI labels / retired ids → active keep-list.
  // Juliet (AniWatch/AniZone) retired from the active roster — fall back to site default.
  if (value === "AniZone" || value === "Juliet" || value === "AniWatch") {
    return DEFAULT_KITTY_PROVIDER;
  }
  if (value === "AnimeStream" || value === "KaaLt") return "KickAssAnime";
  if (value === "AllAnime" || value === "Bravo") return DEFAULT_KITTY_PROVIDER;
  if (value === "Mkissa" || value === "MKissa") return "MKissa";
  if (value === "ReAnime" || value === "KuroHost" || value === "Hotel") return DEFAULT_KITTY_PROVIDER;
  if (value === "Xray" || value === "Animex") return DEFAULT_KITTY_PROVIDER;
  if (value === "Golf" || value === "AnimeGG") return "AnimeGG";
  if (value === "Mike" || value === "MegaVid") return "MegaVid";
  if (value === "Heaven" || value === "AnimeHeaven") return DEFAULT_KITTY_PROVIDER;
  if (value === "Megu" || value === "MeguAnimes" || value === "MeguAnime") return DEFAULT_KITTY_PROVIDER;
  if (value === "Ya" || value === "VidNest" || value === "Mp4Upload" || value === "MP4Upload") {
    return DEFAULT_KITTY_PROVIDER;
  }
  if (value === "Taku") return DEFAULT_KITTY_PROVIDER;
  if (value === "Lok" || value === "AnimeLok") return DEFAULT_KITTY_PROVIDER;
  if (value === "Echo") return "Miruro";
  if (value === "Sierra" || value === "Snatch") return "AniSnatch";
  if (value === "Vibe" || value === "AniVibeLive") return "AniVibe";
  if (value === "Alpha") return "AniKuro";
  // Lima was AniKura — retired, map to UniqueStream
  if (value === "Lima" || value === "AniKura") return "UniqueStream";
  if (
    value === "Delta" ||
    value === "DB" ||
    value === "AniDbApp" ||
    value === "AniDb" ||
    value === "AniDelta"
  ) {
    return "AniDelta";
  }
  // HQ retired from default roster — map saved HQ prefs onto Mkissa (same slot).
  if (value === "HQ" || value === "AniHQ") return "MKissa";
  if (value === "Guard" || value === "Senshi") return "Senshi";
  if (value === "BD" || value === "AniBd" || value === "Anibd") return "Anikoto";
  if (value === "Waves" || value === "Whiskey" || value === "AniWaves") return "AniWaves";
  if (
    value === "Flix" ||
    value === "FlixCloud" ||
    value === "Zenkai" ||
    value === "Yenime" ||
    value === "Yen" ||
    value === "HentaiHaven" ||
    value === "Haven"
  ) {
    return DEFAULT_KITTY_PROVIDER;
  }
  // MegaPlay + pre-unification ids → Anikoto (MegaPlay class removed from API).
  if (value === MEGAPLAY_PROVIDER_ID || (value && LEGACY_MEGAPLAY_PROVIDERS.has(value))) {
    return "Anikoto";
  }
  if (value && isActiveKittyProvider(value)) return value;
  // Any retired provider (or unknown value) falls back to the default.
  return DEFAULT_KITTY_PROVIDER;
}

export function getKittyProviderMeta(id: KittyProvider): KittyProviderMeta {
  return KITTY_PROVIDER_META.find((p) => p.id === id) ?? { id, label: id, group: "other" };
}

/** Site-only display name for UI — never the scrape/API provider id. */
export function getKittyProviderLabel(id: string | null | undefined): string {
  const normalized = normalizeKittyProvider(id);
  return getKittyProviderMeta(normalized).label;
}

export function isDefaultProvider(id: KittyProvider): boolean {
  return id === DEFAULT_KITTY_PROVIDER;
}

export function isAdultOnlyKittyProvider(id: string | null | undefined): boolean {
  if (!id || !isKittyProvider(id)) return false;
  return getKittyProviderMeta(id).adultOnly === true;
}

export function kittyProvidersByGroup(group: KittyProviderGroup): KittyProviderMeta[] {
  return KITTY_PROVIDER_META.filter((p) => p.group === group && isActiveKittyProvider(p.id));
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

/** Maps legacy MULTI to sub; keeps sub / dub / hardsub as distinct picker rows. */
export function normalizeProviderAudioMode(
  mode: string | null | undefined,
  fallback: ProviderAudioMode = "sub",
): ProviderAudioMode {
  if (mode === "sub" || mode === "dub" || mode === "hardsub") return mode;
  if (mode === "multi") return "sub";
  return fallback;
}

/** Burned-in only — no soft tracks (Heaven). */
export function providerIsHardSubOnly(provider: KittyProvider): boolean {
  return providerHasHardSub(provider) && !providerHasSoftSub(provider);
}

/**
 * Soft sub · Hard Subs · Dub rows.
 * Hard-only (Heaven) → Hard Subs only.
 * Soft providers → Soft only (hardSub cleared site-wide except Heaven).
 */
const DUAL_HARD_SUB_PROVIDER_IDS = new Set<string>([]);

export function kittyProvidersForAudioMode(
  mode: ProviderAudioMode,
  opts?: { includeAdult?: boolean },
): KittyProviderMeta[] {
  const normalized = normalizeProviderAudioMode(mode);
  return KITTY_PROVIDER_META.filter((p) => {
    if (!isActiveKittyProvider(p.id)) return false;
    if (!opts?.includeAdult && p.adultOnly) return false;
    if (normalized === "dub") return p.supportsDub === true;
    if (normalized === "hardsub") {
      if (p.hardSub !== true) return false;
      if (p.softSub !== true) return true; // hard-only
      return DUAL_HARD_SUB_PROVIDER_IDS.has(p.id);
    }
    if (normalized === "sub") {
      if (p.supportsSub === false) return false;
      if (p.hardSub === true && p.softSub !== true) return false;
      return true;
    }
    return false;
  });
}
