import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import {
  mergeStreamCapabilities,
  supportsStreamAudioMode,
  type EpisodeStreamCapabilities,
  type StreamCapabilities,
} from "@/lib/kitty/stream-capabilities-shared";

export function buildAvailableProviderSet(
  caps: EpisodeStreamCapabilities | undefined,
  mode: ProviderAudioMode,
): Set<KittyProvider> | null {
  if (!caps?.providers || Object.keys(caps.providers).length === 0) return null;
  const out = new Set<KittyProvider>();
  for (const [id, row] of Object.entries(caps.providers)) {
    if (mode === "hardsub") {
      if (row.hardSub) {
        out.add(id as KittyProvider);
      }
      continue;
    }
    if (mode === "sub") {
      if (supportsStreamAudioMode(row, "sub") && !(row.hardSub && !row.softSub)) {
        out.add(id as KittyProvider);
      }
      continue;
    }
    // Dub: require a real distinct dub probe — never treat multi-only as dub.
    if (row.dub) {
      out.add(id as KittyProvider);
      continue;
    }
    // MKissa provider-level caps can lag mirrors — treat any playable dub mirror as available.
    if (id === "MKissa" && caps.mkissaServers) {
      if (Object.values(caps.mkissaServers).some((m) => Boolean(m?.dub))) {
        out.add(id as KittyProvider);
      }
    }
  }
  return out.size > 0 ? out : null;
}

export function providerCapabilityBadges(
  caps: StreamCapabilities | null | undefined,
): { sub: boolean; dub: boolean } {
  if (!caps) return { sub: false, dub: false };
  return {
    sub: supportsStreamAudioMode(caps, "sub"),
    dub: supportsStreamAudioMode(caps, "dub"),
  };
}

/** Provider-level caps with MKissa mirror fallback for S/D badges. */
export function resolveProviderBadgeCaps(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
): StreamCapabilities | null {
  const providerCaps = caps?.providers?.[provider] ?? null;
  if (providerCaps && (providerCaps.sub || providerCaps.dub)) return providerCaps;
  if (provider === "MKissa" && caps?.mkissaServers) {
    const mirrors = Object.values(caps.mkissaServers).filter(
      (row): row is StreamCapabilities => Boolean(row),
    );
    if (mirrors.length > 0) return mergeStreamCapabilities(...mirrors);
  }
  return providerCaps;
}

export function isProviderAvailableForMode(
  provider: KittyProvider,
  mode: ProviderAudioMode,
  caps: EpisodeStreamCapabilities | undefined,
): boolean {
  if (!caps?.providers) return true;
  const row = caps.providers[provider];
  if (mode === "hardsub") {
    if (row?.hardSub) return true;
    if (provider === "MKissa" && caps.mkissaServers) {
      return Object.values(caps.mkissaServers).some((m) => Boolean(m?.hardSub));
    }
    return false;
  }
  if (mode === "sub") {
    if (row && supportsStreamAudioMode(row, "sub") && !(row.hardSub && !row.softSub)) return true;
    return false;
  }
  // Dub row
  if (row?.dub) return true;
  if (provider === "MKissa" && caps.mkissaServers) {
    return Object.values(caps.mkissaServers).some((m) => Boolean(m?.dub));
  }
  return false;
}
