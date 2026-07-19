import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import {
  buildProviderFallbackOrder,
  getPreferredDefaultProvider,
} from "@/lib/kitty/provider-order";

/** Preferred order when auto-switching after a stream failure (site default). */
export const PROVIDER_FALLBACK_ORDER: KittyProvider[] = buildProviderFallbackOrder(null);

export function getNextFallbackProvider(
  current: KittyProvider,
  tried: ReadonlySet<KittyProvider>,
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
): KittyProvider | null {
  const order =
    customOrder && customOrder.length > 0
      ? buildProviderFallbackOrder(customOrder, defaultProvider)
      : defaultProvider
        ? buildProviderFallbackOrder(null, defaultProvider)
        : PROVIDER_FALLBACK_ORDER;

  const startIdx = order.indexOf(current);
  const searchFrom = startIdx >= 0 ? startIdx + 1 : 0;

  for (let i = searchFrom; i < order.length; i++) {
    const p = order[i];
    if (!tried.has(p)) return p;
  }
  for (let i = 0; i < searchFrom; i++) {
    const p = order[i];
    if (!tried.has(p)) return p;
  }
  return null;
}

/** First provider to try when nothing is saved yet. */
export function getDefaultProviderForOrder(
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
): KittyProvider {
  return getPreferredDefaultProvider(customOrder, defaultProvider);
}
