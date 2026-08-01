import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import {
  buildProviderFallbackOrder,
  getPreferredDefaultProvider,
} from "@/lib/kitty/provider-order";
import { getProviderOutcomeStatus } from "@/lib/kitty/provider-prefs";

/** Preferred order when auto-switching after a stream failure (site default). */
export const PROVIDER_FALLBACK_ORDER: KittyProvider[] = buildProviderFallbackOrder(null);

/**
 * Next untried provider in priority order, skipping ahead past ones this
 * browser has recently seen fail a lot ({@link getProviderOutcomeStatus} ===
 * "unreliable") when a better untried candidate exists — so auto-fallback
 * doesn't waste a retry cycle re-trying something already known to be down.
 * Falls back to the known-unreliable candidate if it's the only one left.
 */
export function getNextFallbackProvider(
  current: KittyProvider,
  tried: ReadonlySet<KittyProvider>,
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
  opts?: { includeAdult?: boolean },
): KittyProvider | null {
  const order =
    customOrder && customOrder.length > 0
      ? buildProviderFallbackOrder(customOrder, defaultProvider, opts)
      : defaultProvider
        ? buildProviderFallbackOrder(null, defaultProvider, opts)
        : opts?.includeAdult
          ? buildProviderFallbackOrder(null, null, opts)
          : PROVIDER_FALLBACK_ORDER;

  const startIdx = order.indexOf(current);
  const searchFrom = startIdx >= 0 ? startIdx + 1 : 0;

  const candidates: KittyProvider[] = [];
  for (let i = searchFrom; i < order.length; i++) {
    const p = order[i];
    if (!tried.has(p)) candidates.push(p);
  }
  for (let i = 0; i < searchFrom; i++) {
    const p = order[i];
    if (!tried.has(p)) candidates.push(p);
  }
  if (candidates.length === 0) return null;

  const healthy = candidates.find((p) => getProviderOutcomeStatus(p) !== "unreliable");
  return healthy ?? candidates[0];
}

/** First provider to try when nothing is saved yet. */
export function getDefaultProviderForOrder(
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
): KittyProvider {
  return getPreferredDefaultProvider(customOrder, defaultProvider);
}
