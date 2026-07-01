import {
  KITTY_PROVIDERS,
  KITTY_PROVIDER_META,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

const FEATURED = KITTY_PROVIDER_META.filter((p) => p.group === "featured").map(
  (p) => p.id,
);

const featuredSet = new Set<KittyProvider>(FEATURED);

/** Preferred order when auto-switching after a stream failure. */
export const PROVIDER_FALLBACK_ORDER: KittyProvider[] = [
  ...FEATURED,
  ...KITTY_PROVIDERS.filter((p) => !featuredSet.has(p)),
];

export function getNextFallbackProvider(
  current: KittyProvider,
  tried: ReadonlySet<KittyProvider>,
): KittyProvider | null {
  const startIdx = PROVIDER_FALLBACK_ORDER.indexOf(current);
  const searchFrom = startIdx >= 0 ? startIdx + 1 : 0;

  for (let i = searchFrom; i < PROVIDER_FALLBACK_ORDER.length; i++) {
    const p = PROVIDER_FALLBACK_ORDER[i];
    if (!tried.has(p)) return p;
  }
  for (let i = 0; i < searchFrom; i++) {
    const p = PROVIDER_FALLBACK_ORDER[i];
    if (!tried.has(p)) return p;
  }
  return null;
}
