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
  "AniBD",
  "Nyanime",
  "AnimeOnsen",
  "AnimeNexus",
  "Animeya",
  "Anizen",
  "AniWaves",
  "AnimaxAnime",
] as const;

export type KittyProvider = (typeof ALL_KITTY_PROVIDER_IDS)[number];

/**
 * Active providers exposed on the VPS cluster. These are the only ids users can
 * select; the API paths (`/provider/{id}/…`) use these exact names.
 */
export const KITTY_PROVIDERS = [
  "Anitaku",
  "MegaPlay",
  "AniNeko",
  "AniBD",
  "AllAnime",
  "MKissa",
  "AniKuro",
  "AniWaves",
  "Anikage",
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
    id: "Anitaku",
    label: "Beta",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    hardSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · soft & hard subs · multi-server",
  },
  {
    id: "MegaPlay",
    label: "Alpha",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "AniList ID · stream-direct · up to 1080p · SUB · DUB · VTT",
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
    hint: "SUB · DUB · multi-server · soft subs",
  },
  {
    id: "AniBD",
    label: "Hotel",
    group: "featured",
    supportsSub: true,
    supportsDub: false,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB only · AniList ID · stream-direct",
  },
  {
    id: "AllAnime",
    label: "Delta",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "SUB · DUB · MP4/HLS · multi-server",
  },
  {
    id: "MKissa",
    label: "Echo",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "SUB · DUB · redundancy · MP4/HLS",
  },
  {
    id: "AniKuro",
    label: "Foxtrot",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "SUB · DUB · multi-route · soft subs",
  },
  {
    id: "AniWaves",
    label: "Golf",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    supportsMulti: true,
    hint: "SUB · DUB · multi-route · soft subs",
  },
  {
    id: "Anikage",
    label: "India",
    group: "featured",
    supportsSub: true,
    supportsDub: true,
    softSub: true,
    nativeSubs: true,
    kittySubs: true,
    hint: "SUB · DUB · slug or watch URL · stream-direct",
  },
];

/** Preferred providers — the first is what loads by default, and auto-fallback
 * tries these before anything else. AllAnime/MKissa are last-resort mirrors. */
export const DEFAULT_PROVIDER_PRIORITY: KittyProvider[] = [
  "Anitaku",
  "MegaPlay",
  "AniNeko",
  "AniBD",
  "AllAnime",
  "MKissa",
  "AniKuro",
  "AniWaves",
  "Anikage",
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
  "AllAnime",
  "MKissa",
  MEGAPLAY_PROVIDER_ID,
  "Anitaku",
  "AniNeko",
  "AniBD",
  "AniKuro",
  "AniWaves",
  "Anikage",
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
  if (value && isActiveKittyProvider(value)) return value;
  if (value && LEGACY_MEGAPLAY_PROVIDERS.has(value)) return MEGAPLAY_PROVIDER_ID;
  // Any retired provider (or unknown value) falls back to the default.
  return DEFAULT_KITTY_PROVIDER;
}

export function getKittyProviderMeta(id: KittyProvider): KittyProviderMeta {
  return KITTY_PROVIDER_META.find((p) => p.id === id) ?? { id, label: id, group: "other" };
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

/** Providers that only appear in the MULTI row (server picker expands below). */
export const MULTI_ROW_PROVIDERS = new Set<KittyProvider>([
  "AniKuro",
  "AniWaves",
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
