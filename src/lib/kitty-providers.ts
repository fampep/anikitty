export const KITTY_PROVIDERS = [
  "Miruro",
  "AnimeSogo",
  "Anitaku",
  "Anikage",
  "AnimeHeaven",
  "KaaLt",
  "MKissa",
  "Senshi",
  "Animetsu",
  "Animeverse",
  "AniZone",
  "Anikoto",
  "AnimeGG",
  "AniDB",
  "Nyanime",
  "AnimeOnsen",
  "Animeya",
  "AniWaves",
] as const;

export type KittyProvider = (typeof KITTY_PROVIDERS)[number];

export type KittyProviderGroup = "featured" | "other";

export type KittyProviderMeta = {
  id: KittyProvider;
  label: string;
  group: KittyProviderGroup;
  /** Player embed includes subtitle tracks (e.g. AnimeSogo MegaPlay VTT). */
  nativeSubs?: boolean;
  hint?: string;
};

export const KITTY_PROVIDER_META: KittyProviderMeta[] = [
  { id: "Miruro", label: "Miruro", group: "featured", nativeSubs: true, hint: "Multi-pipe, best overall" },
  {
    id: "AnimeSogo",
    label: "AnimeSogo",
    group: "featured",
    nativeSubs: true,
    hint: "HD-1 / HD-2 · animesogo.to",
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
  { id: "Anikoto", label: "Anikoto", group: "other" },
  { id: "AnimeGG", label: "AnimeGG", group: "other" },
  { id: "AniDB", label: "AniDB", group: "other" },
  { id: "Nyanime", label: "Nyanime", group: "other" },
  { id: "AnimeOnsen", label: "AnimeOnsen", group: "other" },
  { id: "Animeya", label: "Animeya", group: "other" },
  { id: "AniWaves", label: "AniWaves", group: "other" },
];

export const DEFAULT_KITTY_PROVIDER: KittyProvider = "Miruro";

/** Providers removed from the picker — migrate saved prefs to default. */
const DEPRECATED_PROVIDERS = new Set([
  "AllAnime",
  "AnimeParadise",
  "Anizen",
  "Animo",
  "AniNeko",
]);

/** Keep embed/player subtitle tracks from the upstream stream response. */
export const KITTY_NATIVE_SUB_PROVIDERS = new Set<KittyProvider>(["AnimeSogo"]);

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
