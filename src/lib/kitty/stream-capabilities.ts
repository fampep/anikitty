import { buildKittyStreamDirectPath, kittyApiFetch, kittyStreamHeaders, parseKittyStreamJson } from "@/lib/kitty/kitty-api-server";
import {
  EMPTY_STREAM_CAPABILITIES,
  capabilitiesFromProbes,
  mergeEpisodeStreamCapabilities,
  type EpisodeStreamCapabilities,
  type StreamCapabilities,
  type StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities-shared";

export {
  EMPTY_STREAM_CAPABILITIES,
  capabilitiesFromProbes,
  mergeEpisodeStreamCapabilities,
  mergeStreamCapabilities,
  getProviderCapabilities,
  providerHasStreamCapabilities,
  providerVisibleInAudioMode,
  resolveActiveStreamCapabilities,
  supportsStreamAudioMode,
  canToggleStreamAudio,
  selectionSupportsBothStreamAudioFromCaps,
  animexServerUsesInPlayerAudioFromCaps,
  type StreamCapabilities,
  type EpisodeStreamCapabilities,
  type StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities-shared";
import {
  isAllanimeMirrorId,
  probeAllanimeEpisodeCapabilities,
  type AllanimeKittyServer,
  type AllanimeMirrorId,
} from "@/lib/providers/allanime-api";
import {
  DEFAULT_ANISNATCH_SERVER,
  isAnisnatchServerId,
  probeAnisnatchServerCapabilities,
  type AnisnatchServerId,
} from "@/lib/providers/anisnatch-api";
import {
  probeAnisnatchEpisodeCapabilities,
} from "@/lib/providers/anisnatch-api";
import {
  isKittyProvider,
  KITTY_PROVIDERS,
  getKittyProviderMeta,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";

const EMPTY_MULTI_SERVER_FIELDS = {
  allanimeServers: {},
  mkissaServers: {},
  allanimeServerRows: [] as AllanimeKittyServer[],
  mkissaServerRows: [] as AllanimeKittyServer[],
};

const PROBE_TIMEOUT_MS = 16_000;
const DIRECT_PROBE_CONCURRENCY = 6;

/** Providers that often only succeed on non-primary KittyAPI nodes. */
const PROBE_FAILOVER_PROVIDERS = new Set<KittyProvider>([
  "AniWaves",
  "AniWatch",
  "AniSnatch",
]);

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

type StreamProbeResult = {
  hasFile: boolean;
  file?: string;
  subtitleTracks: number;
  multiAudio?: boolean;
};

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
  const path = buildKittyStreamDirectPath({
    provider,
    anilistId,
    episode,
    audio,
    title,
  });

  try {
    const res = await kittyApiFetch(
      path,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        headers: kittyStreamHeaders(),
      },
      // AniWaves/Byse often only succeed on NL/CA — primary-only probes false-negative.
      { failover: PROBE_FAILOVER_PROVIDERS.has(provider) },
    );

    const data = await res.json();
    const parsed = parseKittyStreamJson(data, res.ok);
    if (!parsed?.file) return { hasFile: false, subtitleTracks: 0 };

    return {
      hasFile: true,
      file: parsed.file,
      subtitleTracks: countSubtitleTracks(parsed.tracks),
      multiAudio: Boolean(
        (data as Record<string, unknown>).multiAudio ??
          (data as Record<string, unknown>).dualAudio ??
          (data as Record<string, unknown>).hasMultiAudio,
      ),
    };
  } catch {
    return { hasFile: false, subtitleTracks: 0 };
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
  const caps = capabilitiesFromProbes(subProbe, dubProbe);
  return caps;
}

const DIRECT_PROBE_PROVIDERS = [...KITTY_PROVIDERS];

const FEATURED_DIRECT_PROBE_PROVIDERS = DIRECT_PROBE_PROVIDERS.filter(
  (p) => getKittyProviderMeta(p).group === "featured",
);

const REST_DIRECT_PROBE_PROVIDERS = DIRECT_PROBE_PROVIDERS.filter(
  (p) => getKittyProviderMeta(p).group !== "featured",
);

async function probeMultiProviderEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
) {
  const [anisnatch, mkissa] = await Promise.all([
    probeAnisnatchEpisodeCapabilities(anilistId, episode, title),
    probeAllanimeEpisodeCapabilities("MKissa", anilistId, episode, title),
  ]);

  return {
    providers: {
      AniSnatch: anisnatch.provider,
      MKissa: mkissa.provider,
    } satisfies Partial<Record<KittyProvider, StreamCapabilities>>,
    anisnatchServers: anisnatch.servers,
    allanimeServers: {},
    mkissaServers: mkissa.servers,
    allanimeServerRows: [],
    mkissaServerRows: mkissa.serverRows,
  };
}

async function probeDirectProviderBatch(
  providers: readonly KittyProvider[],
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<Partial<Record<KittyProvider, StreamCapabilities>>> {
  const rows = await mapWithConcurrency(providers, DIRECT_PROBE_CONCURRENCY, (provider) =>
    probeDirectProviderCapabilities(provider, anilistId, episode, title).then((caps) => ({
      provider,
      caps,
    })),
  );

  const out: Partial<Record<KittyProvider, StreamCapabilities>> = {};
  for (const row of rows) {
    out[row.provider] = row.caps;
  }
  return out;
}

/** Fast first pass: featured + multi providers for the episode grid. */
export async function fetchFeaturedEpisodeStreamCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> {
  const [multi, featuredDirect] = await Promise.all([
    probeMultiProviderEpisodeCapabilities(anilistId, episode, title),
    probeDirectProviderBatch(FEATURED_DIRECT_PROBE_PROVIDERS, anilistId, episode, title),
  ]);

  return mergeEpisodeStreamCapabilities(multi, { providers: featuredDirect });
}

/** Remaining non-featured direct providers. */
export async function fetchRestEpisodeStreamCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> {
  const providers = await probeDirectProviderBatch(
    REST_DIRECT_PROBE_PROVIDERS,
    anilistId,
    episode,
    title,
  );
  return mergeEpisodeStreamCapabilities({ providers });
}

/** Probe sub/dub/hardsub for every provider on an episode (dynamic per anime). */
export async function fetchEpisodeStreamCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> {
  const [featured, rest] = await Promise.all([
    fetchFeaturedEpisodeStreamCapabilities(anilistId, episode, title),
    fetchRestEpisodeStreamCapabilities(anilistId, episode, title),
  ]);
  return mergeEpisodeStreamCapabilities(featured, rest);
}

/** Probe sub/dub/hardsub for the provider the user is currently watching. */
export async function fetchActiveProviderStreamCapabilities(
  anilistId: number,
  episode: number,
  target: StreamCapabilityTarget,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> {
  const { provider } = target;

  if (provider === "AniSnatch") {
    const server = target.anisnatchServer ?? DEFAULT_ANISNATCH_SERVER;
    const caps = await probeAnisnatchServerCapabilities(anilistId, episode, server, title);
    return {
      providers: { AniSnatch: caps },
      anisnatchServers: { [server]: caps },
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  if (provider === "MKissa") {
    const episodeCaps = await probeAllanimeEpisodeCapabilities(
      "MKissa",
      anilistId,
      episode,
      title,
    );
    return {
      providers: { MKissa: episodeCaps.provider },
      anisnatchServers: {},
      allanimeServers: {},
      mkissaServers: episodeCaps.servers,
      allanimeServerRows: [],
      mkissaServerRows: episodeCaps.serverRows,
    };
  }

  const caps = await probeDirectProviderCapabilities(provider, anilistId, episode, title);
  return {
    providers: { [provider]: caps },
    anisnatchServers: {},
    ...EMPTY_MULTI_SERVER_FIELDS,
  };
}

export function parseStreamCapabilityTarget(searchParams: URLSearchParams): StreamCapabilityTarget | null {
  const provider = searchParams.get("provider");
  if (!provider || !isKittyProvider(provider)) return null;

  const target: StreamCapabilityTarget = { provider };

  const anisnatchServer = searchParams.get("anisnatchServer");
  if (anisnatchServer && isAnisnatchServerId(anisnatchServer)) {
    target.anisnatchServer = anisnatchServer;
  }

  const mkissaMirror = searchParams.get("mkissaMirror");
  if (mkissaMirror && isAllanimeMirrorId(mkissaMirror)) {
    target.mkissaMirror = mkissaMirror;
  }

  return target;
}
