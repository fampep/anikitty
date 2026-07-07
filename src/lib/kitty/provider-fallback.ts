import {
  KITTY_PROVIDERS,
  KITTY_PROVIDER_META,
  DEFAULT_PROVIDER_PRIORITY,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

const FEATURED = KITTY_PROVIDER_META.filter((p) => p.group === "featured").map(
  (p) => p.id,
);

/** Preferred order when auto-switching after a stream failure — the default
 * providers first, then the rest of the featured group, then everything else. */
const ordered: KittyProvider[] = [
  ...DEFAULT_PROVIDER_PRIORITY,
  ...FEATURED,
  ...KITTY_PROVIDERS,
];
const seen = new Set<KittyProvider>();
export const PROVIDER_FALLBACK_ORDER: KittyProvider[] = ordered.filter((p) => {
  if (seen.has(p)) return false;
  seen.add(p);
  return true;
});

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
