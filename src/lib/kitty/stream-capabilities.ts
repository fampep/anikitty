import { buildKittyStreamDirectPath, kittyApiFetch, kittyStreamHeaders, parseKittyStreamAudio, parseKittyStreamJson } from "@/lib/kitty/kitty-api-server";
import { fetchKittyAudio } from "@/lib/kitty/kitty-audio-api";
import {
  EMPTY_STREAM_CAPABILITIES,
  capabilitiesFromProbes,
  mergeEpisodeStreamCapabilities,
  mergeStreamCapabilities,
  providerMetaForCaps,
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
  probeAnisnatchEpisodeCapabilities,
} from "@/lib/providers/anisnatch-api";
import {
  DEFAULT_PROVIDER_PRIORITY,
  isKittyProvider,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";

const EMPTY_MULTI_SERVER_FIELDS = {
  anisnatchServers: {},
  allanimeServers: {},
  mkissaServers: {},
  allanimeServerRows: [] as AllanimeKittyServer[],
  mkissaServerRows: [] as AllanimeKittyServer[],
};

const PROBE_TIMEOUT_MS = 12_000;
/** Keep capability fan-out light — each probe holds stream JSON in memory. */
const DIRECT_PROBE_CONCURRENCY = 2;
/** First-pass probes: top of site priority only (rest deferred to `tier=rest`). */
const FEATURED_PROBE_LIMIT = 5;

/**
 * Multi-server providers are probed via `/servers` (mirrors / site lines).
 * Direct stream-direct often false-negatives (Echo needs a mirror) and used to
 * overwrite good multi results in featured merge.
 * AniSnatch is Kilo-style (single stream-direct) — not multi-server.
 */
const MULTI_SERVER_PROBE_PROVIDERS = new Set<KittyProvider>(["MKissa"]);

/** Providers that often only succeed on non-primary KittyAPI nodes (sequential). */
const PROBE_FAILOVER_PROVIDERS = new Set<KittyProvider>([
  "Anikoto",
  "AniDelta",
  "AniVibe",
  "MKissa",
]);

/**
 * In-memory SUB/DUB episode totals from KittyAPI `/audio` (not full stream catalogs).
 * Key: provider:anilistId
 */
type AudioCountCacheEntry = { exp: number; sub: number; dub: number };
const AUDIO_COUNT_TTL_MS = 10 * 60_000;
const audioCountCache = new Map<string, AudioCountCacheEntry>();

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
  servedAudio?: "sub" | "dub";
  subtitleTracks: number;
  multiAudio?: boolean;
};

function countSubtitleTracks(tracks: unknown): number {
  if (!Array.isArray(tracks)) return 0;
  return tracks.filter((t) => isSubtitleTrack(t as StreamTrack)).length;
}

function probeResultFromPayload(
  parsed: { file?: string; tracks?: unknown; audio?: "sub" | "dub" } | null,
  raw: unknown,
  multiAudio?: boolean,
): StreamProbeResult {
  if (!parsed?.file) return { hasFile: false, subtitleTracks: 0 };
  return {
    hasFile: true,
    file: parsed.file,
    servedAudio: parsed.audio ?? parseKittyStreamAudio(raw),
    subtitleTracks: countSubtitleTracks(parsed.tracks),
    multiAudio: Boolean(multiAudio),
  };
}

async function probeStreamDirect(
  provider: KittyProvider,
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): Promise<StreamProbeResult | null> {
  // Capability probes stay single-node (no multi-peer race) to cut peak RAM/CPU.
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
      { failover: PROBE_FAILOVER_PROVIDERS.has(provider) },
    );

    const data = await res.json();
    const parsed = parseKittyStreamJson(data, res.ok);
    return probeResultFromPayload(
      parsed,
      data,
      Boolean(
        (data as Record<string, unknown>).multiAudio ??
          (data as Record<string, unknown>).dualAudio ??
          (data as Record<string, unknown>).hasMultiAudio,
      ),
    );
  } catch {
    return { hasFile: false, subtitleTracks: 0 };
  }
}

/** OR-merge provider maps so a failed direct probe cannot wipe a good /servers hit. */
function mergeProviderCapabilityMaps(
  ...maps: Array<Partial<Record<KittyProvider, StreamCapabilities>> | undefined>
): Partial<Record<KittyProvider, StreamCapabilities>> {
  const out: Partial<Record<KittyProvider, StreamCapabilities>> = {};
  for (const map of maps) {
    if (!map) continue;
    for (const key of Object.keys(map) as KittyProvider[]) {
      const caps = map[key];
      if (!caps) continue;
      const prev = out[key];
      out[key] = prev ? mergeStreamCapabilities(prev, caps) : caps;
    }
  }
  return out;
}

/**
 * Episode availability from `/audio` counts only — never pulls whole-series `/streams`.
 * `episode <= sub|dub` is the same heuristic AniSnatch caps already use for totals.
 */
async function capsFromAudioCounts(
  provider: KittyProvider,
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<StreamCapabilities | null> {
  const key = `${provider}:${anilistId}`;
  const hit = audioCountCache.get(key);
  let sub = 0;
  let dub = 0;
  if (hit && hit.exp > Date.now()) {
    sub = hit.sub;
    dub = hit.dub;
  } else {
    const counts = await fetchKittyAudio({
      anilistId,
      provider,
      title,
      timeoutMs: 12_000,
    });
    if (!counts) return null;
    sub = counts.sub;
    dub = counts.dub;
    audioCountCache.set(key, { exp: Date.now() + AUDIO_COUNT_TTL_MS, sub, dub });
  }

  return capabilitiesFromProbes(
    {
      hasFile: episode >= 1 && episode <= sub,
      subtitleTracks: 0,
    },
    {
      hasFile: episode >= 1 && episode <= dub,
      subtitleTracks: 0,
    },
    providerMetaForCaps(provider),
  );
}

async function probeDirectProviderCapabilities(
  provider: KittyProvider,
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<StreamCapabilities> {
  // Prefer lightweight `/audio` totals — no full-show embed/file catalog.
  const fromAudio = await capsFromAudioCounts(provider, anilistId, episode, title);
  if (fromAudio) return fromAudio;

  // Last resort: probe only this episode via stream-direct (caches that episode only).
  const subProbe = await probeStreamDirect(provider, anilistId, episode, "sub", title);
  const dubProbe = await probeStreamDirect(provider, anilistId, episode, "dub", title);
  return capabilitiesFromProbes(subProbe, dubProbe, providerMetaForCaps(provider));
}

const DIRECT_PROBE_PROVIDERS = KITTY_PROVIDERS.filter(
  (p) => !MULTI_SERVER_PROBE_PROVIDERS.has(p),
);

const FEATURED_DIRECT_PROBE_PROVIDERS = DEFAULT_PROVIDER_PRIORITY.filter((p) =>
  (DIRECT_PROBE_PROVIDERS as readonly KittyProvider[]).includes(p),
).slice(0, FEATURED_PROBE_LIMIT);

const FEATURED_DIRECT_SET = new Set<KittyProvider>(FEATURED_DIRECT_PROBE_PROVIDERS);

const REST_DIRECT_PROBE_PROVIDERS = DIRECT_PROBE_PROVIDERS.filter(
  (p) => !FEATURED_DIRECT_SET.has(p),
);

async function probeMultiProviderEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
) {
  // AniSnatch is direct stream-direct (like Kilo); only MKissa keeps /servers probes.
  const mkissa = await probeAllanimeEpisodeCapabilities("MKissa", anilistId, episode, title);

  return {
    providers: {
      MKissa: mkissa.provider,
    } satisfies Partial<Record<KittyProvider, StreamCapabilities>>,
    anisnatchServers: {},
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

  const providers = mergeProviderCapabilityMaps(multi.providers, featuredDirect);
  return mergeEpisodeStreamCapabilities(
    { ...multi, providers: {} },
    { providers },
  );
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
    const episodeCaps = await probeAnisnatchEpisodeCapabilities(anilistId, episode, title);
    return {
      providers: { AniSnatch: episodeCaps.provider },
      anisnatchServers: {},
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

  const mkissaMirror = searchParams.get("mkissaMirror");
  if (mkissaMirror && isAllanimeMirrorId(mkissaMirror)) {
    target.mkissaMirror = mkissaMirror;
  }

  return target;
}
