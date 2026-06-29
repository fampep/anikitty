export const KITTY_PROVIDERS = [
  "Miruro",
  "Animex",
  "Animo",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
  "Anikoto",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
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
  "AniWaves",
] as const;

export type KittyProvider = (typeof KITTY_PROVIDERS)[number];

export type KittyProviderGroup = "featured" | "subs" | "other";

export type KittyProviderMeta = {
  id: KittyProvider;
  label: string;
  group: KittyProviderGroup;
  /** Player embed includes subtitle tracks from stream-direct. */
  nativeSubs?: boolean;
  /** Kitty /subs endpoint supports this provider. */
  kittySubs?: boolean;
  /** Provider exposes dub streams via Kitty API (audio=dub). */
  supportsDub?: boolean;
  /** Dual-audio / multi-track embed (Miruro pipes, Animex Zen, etc.). */
  supportsMulti?: boolean;
  /** Stream is hard-subbed (no separate subtitle tracks). */
  hardSub?: boolean;
  hint?: string;
};

export type ProviderAudioMode = "sub" | "dub" | "multi";

export const KITTY_PROVIDER_META: KittyProviderMeta[] = [
  {
    id: "Miruro",
    label: "Miruro",
    group: "featured",
    nativeSubs: true,
    supportsDub: true,
    supportsMulti: true,
    hint: "Multi-pipe · SUB · DUB",
  },
  {
    id: "Animex",
    label: "Animex",
    group: "featured",
    nativeSubs: true,
    supportsDub: true,
    supportsMulti: true,
    hint: "Zen · Koto · Beep · Mimi · Yuki · Uwu · Mochi · Neko · Sax · Yume · Kiwi",
  },
  {
    id: "Animo",
    label: "Animo",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "4animo.xyz · HD-1 / HD-2 / HD-3 · SUB · DUB",
  },
  {
    id: "AnimeSogo",
    label: "AnimeSogo",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "HD-1 / HD-2 · SUB · DUB",
  },
  {
    id: "Anix",
    label: "Anix",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "MegaPlay · SUB · DUB",
  },
  {
    id: "HiAnime",
    label: "HiAnime",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "MegaPlay · SUB · DUB",
  },
  {
    id: "Animepahe",
    label: "Animepahe",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "Megaplay / Vidplay · SUB · DUB",
  },
  {
    id: "Anikoto",
    label: "Anikoto",
    group: "featured",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "Mirrors · SUB · DUB",
  },
  { id: "Anitaku", label: "Anitaku", group: "other", nativeSubs: true, hint: "SUB · Soft sub tracks" },
  { id: "Anikage", label: "Anikage", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AnimeHeaven", label: "AnimeHeaven", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "KaaLt", label: "KaaLt", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  {
    id: "AllAnime",
    label: "AllAnime",
    group: "other",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "allmanga.to · Default · Ok · Mp4 · SUB · DUB",
  },
  {
    id: "MKissa",
    label: "MKissa",
    group: "other",
    nativeSubs: true,
    kittySubs: true,
    supportsDub: true,
    hint: "mkissa.to · Ok · Uni · Fm-Hls · Mp4 · SUB · DUB",
  },
  { id: "Senshi", label: "Senshi", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "Animetsu", label: "Animetsu", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "Animeverse", label: "Animeverse", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AniZone", label: "AniZone", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AnimeGG", label: "AnimeGG", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AniDB", label: "AniDB", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  {
    id: "AniBD",
    label: "AniBD",
    group: "other",
    hardSub: true,
    hint: "Anibd.app · PlayEng SR · SUB · Hard sub (BD)",
  },
  { id: "Nyanime", label: "Nyanime", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AnimeOnsen", label: "AnimeOnsen", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AnimeNexus", label: "AnimeNexus", group: "other", nativeSubs: true, kittySubs: true, hint: "SUB · Multi-language ASS" },
  { id: "Animeya", label: "Animeya", group: "other", hardSub: true, hint: "SUB · Hard sub" },
  { id: "AniWaves", label: "AniWaves", group: "other", hardSub: true, hint: "SUB · Hard sub" },
];

export const DEFAULT_KITTY_PROVIDER: KittyProvider = "Miruro";

const DEPRECATED_PROVIDERS = new Set([
  "AnimeParadise",
  "Anizen",
  "AniNeko",
  "AnimeStream",
]);

/** MegaPlay family — SUB and DUB via Kitty stream-direct + /subs. */
export const KITTY_MEGAPLAY_PROVIDERS = new Set<KittyProvider>([
  "Animo",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
  "Anikoto",
]);

/** Stream providers whose embed tracks are kept from stream-direct. */
export const KITTY_NATIVE_SUB_PROVIDERS = new Set<KittyProvider>([
  ...KITTY_MEGAPLAY_PROVIDERS,
  "Animex",
  "AllAnime",
  "MKissa",
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

export function providerSupportsMulti(provider: KittyProvider): boolean {
  return getKittyProviderMeta(provider).supportsMulti === true;
}

/** Providers that only appear in the MULTI row (server picker expands below). */
export const MULTI_ROW_PROVIDERS = new Set<KittyProvider>(["Miruro", "Animex"]);

export function kittyProvidersForAudioMode(mode: ProviderAudioMode): KittyProviderMeta[] {
  return KITTY_PROVIDER_META.filter((p) => {
    if (mode === "multi") return p.supportsMulti === true;
    if (mode === "dub") return p.supportsDub === true && !MULTI_ROW_PROVIDERS.has(p.id);
    return !MULTI_ROW_PROVIDERS.has(p.id);
  });
}
