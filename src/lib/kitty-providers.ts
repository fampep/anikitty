export const KITTY_PROVIDERS = [
  "Miruro",
  "Animex",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
  "Anikoto",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
  "KaaLt",
  "MKissa",
  "Senshi",
  "Animetsu",
  "Animeverse",
  "AniZone",
  "AnimeGG",
  "AniDB",
  "Nyanime",
  "AnimeOnsen",
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
  hint?: string;
};

export const KITTY_PROVIDER_META: KittyProviderMeta[] = [
  { id: "Miruro", label: "Miruro", group: "featured", nativeSubs: true, supportsDub: true, hint: "Multi-pipe · SUB · DUB" },
  {
    id: "Animex",
    label: "Animex",
    group: "featured",
    nativeSubs: true,
    supportsDub: true,
    hint: "Zen + MegaPlay · AniList ID · SUB · DUB",
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
  { id: "Anitaku", label: "Anitaku", group: "other" },
  { id: "Anikage", label: "Anikage", group: "other" },
  { id: "AnimeHeaven", label: "AnimeHeaven", group: "other" },
  { id: "KaaLt", label: "KaaLt", group: "other" },
  { id: "MKissa", label: "MKissa", group: "other" },
  { id: "Senshi", label: "Senshi", group: "other" },
  { id: "Animetsu", label: "Animetsu", group: "other" },
  { id: "Animeverse", label: "Animeverse", group: "other" },
  { id: "AniZone", label: "AniZone", group: "other" },
  { id: "AnimeGG", label: "AnimeGG", group: "other" },
  { id: "AniDB", label: "AniDB", group: "other" },
  { id: "Nyanime", label: "Nyanime", group: "other" },
  { id: "AnimeOnsen", label: "AnimeOnsen", group: "other" },
  { id: "Animeya", label: "Animeya", group: "other" },
  { id: "AniWaves", label: "AniWaves", group: "other" },
];

export const DEFAULT_KITTY_PROVIDER: KittyProvider = "Miruro";

const DEPRECATED_PROVIDERS = new Set([
  "AllAnime",
  "AnimeParadise",
  "Anizen",
  "Animo",
  "AniNeko",
]);

/** MegaPlay family — SUB and DUB via Kitty stream-direct + /subs. */
export const KITTY_MEGAPLAY_PROVIDERS = new Set<KittyProvider>([
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
