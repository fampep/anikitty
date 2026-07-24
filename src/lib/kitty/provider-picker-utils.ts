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
  const audio = mode === "dub" ? "dub" : "sub";
  for (const [id, row] of Object.entries(caps.providers)) {
    if (mode === "hardsub") {
      if (row.hardSub || (supportsStreamAudioMode(row, "sub") && row.softSub)) {
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
    if (supportsStreamAudioMode(row, audio)) {
      out.add(id as KittyProvider);
      continue;
    }
    // MKissa provider-level caps can lag mirrors — treat any playable mirror as available.
    if (id === "MKissa" && caps.mkissaServers) {
      const mirrorHit = Object.values(caps.mkissaServers).some((m) =>
        supportsStreamAudioMode(m, audio),
      );
      if (mirrorHit) out.add(id as KittyProvider);
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
  const audio = mode === "dub" ? "dub" : "sub";
  const row = caps.providers[provider];
  if (mode === "hardsub") {
    if (row && (row.hardSub || (supportsStreamAudioMode(row, "sub") && row.softSub))) return true;
    if (provider === "MKissa" && caps.mkissaServers) {
      return Object.values(caps.mkissaServers).some((m) => {
        if (!m) return false;
        return m.hardSub || (supportsStreamAudioMode(m, "sub") && m.softSub);
      });
    }
    return false;
  }
  if (mode === "sub") {
    if (row && supportsStreamAudioMode(row, "sub") && !(row.hardSub && !row.softSub)) return true;
    return false;
  }
  if (row && supportsStreamAudioMode(row, audio)) return true;
  if (provider === "MKissa" && caps.mkissaServers) {
    return Object.values(caps.mkissaServers).some((m) => supportsStreamAudioMode(m, audio));
  }
  if (!row) return false;
  return supportsStreamAudioMode(row, audio);
}
