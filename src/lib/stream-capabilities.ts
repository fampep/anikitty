import { buildKittyStreamDirectUrl, kittyApiHeaders } from "@/lib/kitty-api";
import {
  KITTY_PROVIDERS,
  MULTI_ROW_PROVIDERS,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty-providers";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitle-track-utils";
import { probeAnimexEpisodeCapabilities } from "@/lib/animex-api";
import { probeMiruroEpisodeCapabilities } from "@/lib/miruro-api";
import type { AnimexServerId } from "@/lib/animex-api";
import type { MiruroPipeProviderId } from "@/lib/miruro-api";

export type StreamCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

export type EpisodeStreamCapabilities = {
  providers: Partial<Record<KittyProvider, StreamCapabilities>>;
  miruroPipes: Partial<Record<MiruroPipeProviderId, StreamCapabilities>>;
  animexServers: Partial<Record<AnimexServerId, StreamCapabilities>>;
};

export const EMPTY_STREAM_CAPABILITIES: StreamCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

const PROBE_TIMEOUT_MS = 8_000;
const DIRECT_PROBE_CONCURRENCY = 6;

type StreamProbeResult = {
  hasFile: boolean;
  file?: string;
  subtitleTracks: number;
  multiAudio?: boolean;
};

export function mergeStreamCapabilities(...items: StreamCapabilities[]): StreamCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

export function capabilitiesFromProbes(
  subProbe: StreamProbeResult | null,
  dubProbe: StreamProbeResult | null,
): StreamCapabilities {
  const hasSub = subProbe?.hasFile ?? false;
  const hasDub = dubProbe?.hasFile ?? false;
  const softSub = (subProbe?.subtitleTracks ?? 0) > 0 || (dubProbe?.subtitleTracks ?? 0) > 0;
  const sameFile =
    hasSub && hasDub && !!subProbe?.file && subProbe.file === dubProbe?.file;

  return {
    sub: hasSub,
    dub: hasDub,
    multi: sameFile || (hasSub && hasDub && Boolean(subProbe?.multiAudio)),
    softSub,
    hardSub: hasSub && !softSub,
  };
}

function countSubtitleTracks(tracks: unknown): number {
  if (!Array.isArray(tracks)) return 0;
  return tracks.filter((t) => isSubtitleTrack(t as StreamTrack)).length;
}

async function probeStreamDirect(
  provider: KittyProvider,
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): Promise<StreamProbeResult | null> {
  const url = buildKittyStreamDirectUrl({
    provider,
    anilistId,
    episode,
    audio,
    title,
  });

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: kittyApiHeaders(),
    });

    const data = await res.json();
    if (!res.ok || !data?.file) {
      return { hasFile: false, subtitleTracks: 0 };
    }

    return {
      hasFile: true,
      file: String(data.file),
      subtitleTracks: countSubtitleTracks(data.tracks),
      multiAudio: Boolean(data.multiAudio ?? data.dualAudio ?? data.hasMultiAudio),
    };
  } catch {
    return null;
  }
}

async function probeDirectProviderCapabilities(
  provider: KittyProvider,
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<StreamCapabilities> {
  const [subProbe, dubProbe] = await Promise.all([
    probeStreamDirect(provider, anilistId, episode, "sub", title),
    probeStreamDirect(provider, anilistId, episode, "dub", title),
  ]);
  return capabilitiesFromProbes(subProbe, dubProbe);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const DIRECT_PROBE_PROVIDERS = KITTY_PROVIDERS.filter(
  (p) => p !== "Miruro" && p !== "Animex",
);

/** Probe Kitty/Miruro/Animex sources for real sub, dub, and subtitle type on one episode. */
export async function fetchEpisodeStreamCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> {
  const [miruro, animex, directCaps] = await Promise.all([
    probeMiruroEpisodeCapabilities(anilistId, episode),
    probeAnimexEpisodeCapabilities(anilistId, episode, title),
    mapPool(DIRECT_PROBE_PROVIDERS, DIRECT_PROBE_CONCURRENCY, (provider) =>
      probeDirectProviderCapabilities(provider, anilistId, episode, title).then(
        (capabilities) => ({ provider, capabilities }),
      ),
    ),
  ]);

  const providers: Partial<Record<KittyProvider, StreamCapabilities>> = {
    Miruro: miruro.provider,
    Animex: animex.provider,
  };

  for (const row of directCaps) {
    providers[row.provider] = row.capabilities;
  }

  return {
    providers,
    miruroPipes: miruro.pipes,
    animexServers: animex.servers,
  };
}

export function getProviderCapabilities(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
): StreamCapabilities | null {
  return caps?.providers[provider] ?? null;
}

export function providerHasStreamCapabilities(
  caps: StreamCapabilities | null | undefined,
): boolean {
  if (!caps) return false;
  return caps.sub || caps.dub || caps.softSub || caps.hardSub || caps.multi;
}

export function providerVisibleInAudioMode(
  provider: KittyProvider,
  mode: ProviderAudioMode,
  caps: StreamCapabilities | null | undefined,
): boolean {
  if (MULTI_ROW_PROVIDERS.has(provider)) {
    if (mode !== "multi") return false;
    if (!caps) return true;
    return providerHasStreamCapabilities(caps);
  }

  if (mode === "multi" || mode === "dub") return false;

  if (!caps) return mode === "sub";

  return providerHasStreamCapabilities(caps);
}

export function selectionSupportsBothStreamAudioFromCaps(
  provider: KittyProvider,
  audioMode: ProviderAudioMode,
  caps: EpisodeStreamCapabilities | undefined,
  animexServer?: AnimexServerId,
  miruroPipe?: MiruroPipeProviderId,
): boolean {
  if (audioMode === "multi") {
    if (provider === "Miruro" && miruroPipe) {
      const pipeCaps = caps?.miruroPipes[miruroPipe];
      return Boolean(pipeCaps && (pipeCaps.multi || (pipeCaps.sub && pipeCaps.dub)));
    }
    if (provider === "Animex" && animexServer) {
      const serverCaps = caps?.animexServers[animexServer];
      return Boolean(serverCaps && (serverCaps.multi || (serverCaps.sub && serverCaps.dub)));
    }
    const providerCaps = caps?.providers[provider];
    return Boolean(providerCaps && (providerCaps.multi || (providerCaps.sub && providerCaps.dub)));
  }

  const providerCaps = caps?.providers[provider];
  return Boolean(providerCaps && providerCaps.sub && providerCaps.dub);
}

export function animexServerUsesInPlayerAudioFromCaps(
  caps: StreamCapabilities | null | undefined,
): boolean {
  return Boolean(caps?.multi);
}
