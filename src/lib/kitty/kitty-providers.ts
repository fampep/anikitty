import {
  LEGACY_MEGAPLAY_PROVIDER_IDS,
  MEGAPLAY_PROVIDER_ID,
} from "@/lib/kitty/megaplay-providers";

/**
 * Every provider id AniKitty has ever known — kept only so historical,
 * provider-specific code paths still type-check. The *active* set that users
 * can actually select is {@link KITTY_PROVIDERS}. Anything not active is
 * normalized to the default provider at runtime.
 */
export const ALL_KITTY_PROVIDER_IDS = [
  "Miruro",
  "MegaPlay",
  "VideoVib",
  "Animex",
  "Animo",
  "AniWatch",
  "AniSnatch",
  "Lunar",
  "Anitaku",
  "AniNeko",
  "AniKuro",
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
  "Anikoto",
  "AniBD",
  "Nyanime",
  "AnimeOnsen",
  "AnimeNexus",
  "Animeya",
  "Anizen",
  "AniWaves",
  "AnimaxAnime",
  "AnimeStream",
  "KickAssAnime",
  "KuroHost",
  "Zenkai",
] as const;

export type KittyProvider = (typeof ALL_KITTY_PROVIDER_IDS)[number];

/**
 * Active providers exposed on the VPS cluster. These are the only ids users can
 * select; the API paths (`/provider/{id}/…`) use these exact names.
 */
export const KITTY_PROVIDERS = [
  "AniKuro",
  "AniWaves",
  "Anikoto",
  "AniWatch",
  "Senshi",
  "AniNeko",
  "MKissa",
  "KickAssAnime",
  "KuroHost",
] as const;

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
    id: "AniKuro",
    label: "Alpha",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs · mirrors",
  },
  {
    id: "AniWaves",
    label: "Whiskey",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: false,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "Anikoto",
    label: "Kilo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft · hard subs",
  },
  {
    id: "AniWatch",
    label: "Juliet",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "Senshi",
    label: "Guard",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft · hard subs",
  },
  {
    id: "AniNeko",
    label: "Gamma",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft · hard subs",
  },
  {
    id: "MKissa",
    label: "Echo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: false,
    hardSub: true,
    nativeSubs: false,
    kittySubs: false,
    hint: "SUB · DUB · hard subs · mirrors",
  },
  {
    id: "KickAssAnime",
    label: "Uniform",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft subs",
  },
  {
    id: "KuroHost",
    label: "Hotel",
    group: "featured",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · soft EN subs",
  },
];

/** Preferred providers — the first is what loads by default, and auto-fallback
 * tries these before anything else. */
export const DEFAULT_PROVIDER_PRIORITY: KittyProvider[] = [
  "AniKuro",
  "AniWaves",
  "Anikoto",
  "AniWatch",
  "Senshi",
  "AniNeko",
  "MKissa",
  "KickAssAnime",
  "KuroHost",
];

export const DEFAULT_KITTY_PROVIDER: KittyProvider = DEFAULT_PROVIDER_PRIORITY[0];

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
  "AniKuro",
  "AniWaves",
  "Anikoto",
  "AniWatch",
  "Senshi",
  "AniNeko",
  "KickAssAnime",
  "KuroHost",
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
  if (value === "AniZone") return "AniNeko";
  if (value === "AllAnime") return "MKissa";
  if (value === "AnimeStream" || value === "KaaLt") return "KickAssAnime";
  if (value === "ReAnime") return "KuroHost";
  if (value === "Zenkai") return DEFAULT_KITTY_PROVIDER;
  if (value && isActiveKittyProvider(value)) return value;
  if (value && LEGACY_MEGAPLAY_PROVIDERS.has(value)) return MEGAPLAY_PROVIDER_ID;
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

/** Maps legacy saved modes (e.g. removed MULTI / HARDSUB rows) to sub or dub. */
export function normalizeProviderAudioMode(
  mode: string | null | undefined,
  fallback: ProviderAudioMode = "sub",
): ProviderAudioMode {
  if (mode === "dub") return "dub";
  if (mode === "sub" || mode === "hardsub" || mode === "multi") return "sub";
  return fallback;
}

export function kittyProvidersForAudioMode(mode: ProviderAudioMode): KittyProviderMeta[] {
  void mode;
  return KITTY_PROVIDER_META;
}
