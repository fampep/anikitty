import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import {
  supportsStreamAudioMode,
  type EpisodeStreamCapabilities,
  type StreamCapabilities,
} from "@/lib/kitty/stream-capabilities";

export function buildAvailableProviderSet(
  caps: EpisodeStreamCapabilities | undefined,
  mode: ProviderAudioMode,
): Set<KittyProvider> | null {
  if (!caps?.providers || Object.keys(caps.providers).length === 0) return null;
  const out = new Set<KittyProvider>();
  const audio = mode === "dub" ? "dub" : "sub";
  for (const [id, row] of Object.entries(caps.providers)) {
    if (supportsStreamAudioMode(row, audio)) {
      out.add(id as KittyProvider);
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

export function isProviderAvailableForMode(
  provider: KittyProvider,
  mode: ProviderAudioMode,
  caps: EpisodeStreamCapabilities | undefined,
): boolean {
  if (!caps?.providers) return true;
  const row = caps.providers[provider];
  if (!row) return false;
  const audio = mode === "dub" ? "dub" : "sub";
  return supportsStreamAudioMode(row, audio);
}
