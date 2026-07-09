import { buildKittyStreamDirectPath, kittyApiFetch, kittyStreamHeaders, parseKittyStreamJson } from "@/lib/kitty/kitty-api-server";
import { isVideoVibProvider, videoVibStreamPaths } from "@/lib/kitty/videovib-provider";
import {
  DEFAULT_LUNAR_SERVER,
  isLunarServerId,
  probeLunarServerCapabilities,
  type LunarServerId,
} from "@/lib/providers/lunar-api";
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
  DEFAULT_ANIMEX_SERVER,
  isAnimexServerId,
  probeAnimexServerCapabilities,
  type AnimexServerId,
} from "@/lib/providers/animex-api";
import {
  DEFAULT_ANIMO_SERVER,
  isAnimoServerId,
  probeAnimoServerCapabilities,
  type AnimoServerId,
} from "@/lib/providers/animo-api";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  isMiruroPipeProviderId,
  probeMiruroEpisodeCapabilities,
  probeMiruroPipeCapabilities,
  type MiruroPipeProviderId,
} from "@/lib/providers/miruro-api";
import {
  probeAnimexEpisodeCapabilities,
} from "@/lib/providers/animex-api";
import {
  probeAnisnatchEpisodeCapabilities,
} from "@/lib/providers/anisnatch-api";
import {
  probeLunarEpisodeCapabilities,
} from "@/lib/providers/lunar-api";
import {
  probeAnimoEpisodeCapabilities,
} from "@/lib/providers/animo-api";
import {
  isKittyProvider,
  KITTY_PROVIDERS,
  MULTI_ROW_PROVIDERS,
  getKittyProviderMeta,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";

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
  animoServers: Partial<Record<AnimoServerId, StreamCapabilities>>;
  anisnatchServers: Partial<Record<AnisnatchServerId, StreamCapabilities>>;
  lunarServers: Partial<Record<LunarServerId, StreamCapabilities>>;
  allanimeServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  mkissaServers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  allanimeServerRows: AllanimeKittyServer[];
  mkissaServerRows: AllanimeKittyServer[];
};

export type StreamCapabilityTarget = {
  provider: KittyProvider;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  animoServer?: AnimoServerId;
  anisnatchServer?: AnisnatchServerId;
  lunarServer?: LunarServerId;
  allanimeMirror?: AllanimeMirrorId;
  mkissaMirror?: AllanimeMirrorId;
};

export const EMPTY_STREAM_CAPABILITIES: StreamCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

const EMPTY_MULTI_SERVER_FIELDS = {
  allanimeServers: {},
  mkissaServers: {},
  allanimeServerRows: [] as AllanimeKittyServer[],
  mkissaServerRows: [] as AllanimeKittyServer[],
};

const PROBE_TIMEOUT_MS = 5_000;
const DIRECT_PROBE_CONCURRENCY = 10;

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
  const paths = isVideoVibProvider(provider)
    ? videoVibStreamPaths({ anilistId, episode, audio, title })
    : [
        buildKittyStreamDirectPath({
          provider,
          anilistId,
          episode,
          audio,
          title,
        }),
      ];

  for (const path of paths) {
    try {
      const res = await kittyApiFetch(path, {
        cache: "no-store",
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        headers: kittyStreamHeaders(),
      });

      const data = await res.json();
      const parsed = parseKittyStreamJson(data, res.ok);
      if (!parsed?.file) continue;

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
      continue;
    }
  }

  return { hasFile: false, subtitleTracks: 0 };
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
  if (
    MULTI_ROW_PROVIDERS.has(provider) &&
    provider !== "AniSnatch" &&
    provider !== "Lunar" &&
    provider !== "AllAnime" &&
    provider !== "MKissa" &&
    caps.sub &&
    caps.dub
  ) {
    return { ...caps, multi: true };
  }
  return caps;
}

const DIRECT_PROBE_PROVIDERS = KITTY_PROVIDERS.filter(
  (p) => !MULTI_ROW_PROVIDERS.has(p) && p !== "Animo",
);

const FEATURED_DIRECT_PROBE_PROVIDERS = DIRECT_PROBE_PROVIDERS.filter(
  (p) => getKittyProviderMeta(p).group === "featured",
);

const REST_DIRECT_PROBE_PROVIDERS = DIRECT_PROBE_PROVIDERS.filter(
  (p) => getKittyProviderMeta(p).group !== "featured",
);

export function mergeEpisodeStreamCapabilities(
  ...parts: Array<Partial<EpisodeStreamCapabilities> | undefined | null>
): EpisodeStreamCapabilities {
  const merged: EpisodeStreamCapabilities = {
    providers: {},
    miruroPipes: {},
    animexServers: {},
    animoServers: {},
    anisnatchServers: {},
    lunarServers: {},
    allanimeServers: {},
    mkissaServers: {},
    allanimeServerRows: [],
    mkissaServerRows: [],
  };

  for (const part of parts) {
    if (!part) continue;
    Object.assign(merged.providers, part.providers);
    Object.assign(merged.miruroPipes, part.miruroPipes);
    Object.assign(merged.animexServers, part.animexServers);
    Object.assign(merged.animoServers, part.animoServers);
    Object.assign(merged.anisnatchServers, part.anisnatchServers);
    Object.assign(merged.lunarServers, part.lunarServers);
    Object.assign(merged.allanimeServers, part.allanimeServers);
    Object.assign(merged.mkissaServers, part.mkissaServers);
    if (part.allanimeServerRows?.length) merged.allanimeServerRows = part.allanimeServerRows;
    if (part.mkissaServerRows?.length) merged.mkissaServerRows = part.mkissaServerRows;
  }

  return merged;
}

async function probeMultiProviderEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
) {
  const [miruro, animex, anisnatch, lunar, allanime, mkissa, animo] = await Promise.all([
    probeMiruroEpisodeCapabilities(anilistId, episode),
    probeAnimexEpisodeCapabilities(anilistId, episode, title),
    probeAnisnatchEpisodeCapabilities(anilistId, episode, title),
    probeLunarEpisodeCapabilities(anilistId, episode, title),
    probeAllanimeEpisodeCapabilities("AllAnime", anilistId, episode, title),
    probeAllanimeEpisodeCapabilities("MKissa", anilistId, episode, title),
    probeAnimoEpisodeCapabilities(anilistId, episode, title),
  ]);

  return {
    providers: {
      Miruro: miruro.provider,
      Animex: animex.provider,
      AniSnatch: anisnatch.provider,
      Lunar: lunar.provider,
      AllAnime: allanime.provider,
      MKissa: mkissa.provider,
      Animo: animo.provider,
    } satisfies Partial<Record<KittyProvider, StreamCapabilities>>,
    miruroPipes: miruro.pipes,
    animexServers: animex.servers,
    animoServers: animo.servers,
    anisnatchServers: anisnatch.servers,
    lunarServers: lunar.servers,
    allanimeServers: allanime.servers,
    mkissaServers: mkissa.servers,
    allanimeServerRows: allanime.serverRows,
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

  if (provider === "Miruro") {
    const pipe = target.miruroPipe ?? DEFAULT_MIRURO_PIPE_PROVIDER;
    const caps = await probeMiruroPipeCapabilities(anilistId, episode, pipe);
    return {
      providers: { Miruro: caps },
      miruroPipes: { [pipe]: caps },
      animexServers: {},
      animoServers: {},
      anisnatchServers: {},
      lunarServers: {},
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  if (provider === "Animex") {
    const server = target.animexServer ?? DEFAULT_ANIMEX_SERVER;
    const caps = await probeAnimexServerCapabilities(anilistId, episode, server);
    return {
      providers: { Animex: caps },
      miruroPipes: {},
      animexServers: { [server]: caps },
      animoServers: {},
      anisnatchServers: {},
      lunarServers: {},
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  if (provider === "AniSnatch") {
    const server = target.anisnatchServer ?? DEFAULT_ANISNATCH_SERVER;
    const caps = await probeAnisnatchServerCapabilities(anilistId, episode, server, title);
    return {
      providers: { AniSnatch: caps },
      miruroPipes: {},
      animexServers: {},
      animoServers: {},
      anisnatchServers: { [server]: caps },
      lunarServers: {},
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  if (provider === "Lunar") {
    const server = target.lunarServer ?? DEFAULT_LUNAR_SERVER;
    const caps = await probeLunarServerCapabilities(anilistId, episode, server, title);
    return {
      providers: { Lunar: caps },
      miruroPipes: {},
      animexServers: {},
      animoServers: {},
      anisnatchServers: {},
      lunarServers: { [server]: caps },
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  if (provider === "AllAnime") {
    const episodeCaps = await probeAllanimeEpisodeCapabilities(
      "AllAnime",
      anilistId,
      episode,
      title,
    );
    return {
      providers: { AllAnime: episodeCaps.provider },
      miruroPipes: {},
      animexServers: {},
      animoServers: {},
      anisnatchServers: {},
      lunarServers: {},
      allanimeServers: episodeCaps.servers,
      mkissaServers: {},
      allanimeServerRows: episodeCaps.serverRows,
      mkissaServerRows: [],
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
      miruroPipes: {},
      animexServers: {},
      animoServers: {},
      anisnatchServers: {},
      lunarServers: {},
      allanimeServers: {},
      mkissaServers: episodeCaps.servers,
      allanimeServerRows: [],
      mkissaServerRows: episodeCaps.serverRows,
    };
  }

  if (provider === "Animo") {
    const server = target.animoServer ?? DEFAULT_ANIMO_SERVER;
    const caps = await probeAnimoServerCapabilities(anilistId, episode, server, title);
    return {
      providers: { Animo: caps },
      miruroPipes: {},
      animexServers: {},
      animoServers: { [server]: caps },
      anisnatchServers: {},
      lunarServers: {},
      ...EMPTY_MULTI_SERVER_FIELDS,
    };
  }

  const caps = await probeDirectProviderCapabilities(provider, anilistId, episode, title);
  return {
    providers: { [provider]: caps },
    miruroPipes: {},
    animexServers: {},
    animoServers: {},
    anisnatchServers: {},
    lunarServers: {},
    ...EMPTY_MULTI_SERVER_FIELDS,
  };
}

export function parseStreamCapabilityTarget(searchParams: URLSearchParams): StreamCapabilityTarget | null {
  const provider = searchParams.get("provider");
  if (!provider || !isKittyProvider(provider)) return null;

  const target: StreamCapabilityTarget = { provider };

  const miruroPipe = searchParams.get("miruroPipe");
  if (miruroPipe && isMiruroPipeProviderId(miruroPipe)) {
    target.miruroPipe = miruroPipe;
  }

  const animexServer = searchParams.get("animexServer");
  if (animexServer && isAnimexServerId(animexServer)) {
    target.animexServer = animexServer;
  }

  const animoServer = searchParams.get("animoServer");
  if (animoServer && isAnimoServerId(animoServer)) {
    target.animoServer = animoServer;
  }

  const anisnatchServer = searchParams.get("anisnatchServer");
  if (anisnatchServer && isAnisnatchServerId(anisnatchServer)) {
    target.anisnatchServer = anisnatchServer;
  }

  const lunarServer = searchParams.get("lunarServer");
  if (lunarServer && isLunarServerId(lunarServer)) {
    target.lunarServer = lunarServer;
  }

  const allanimeMirror = searchParams.get("allanimeMirror");
  if (allanimeMirror && isAllanimeMirrorId(allanimeMirror)) {
    target.allanimeMirror = allanimeMirror;
  }

  const mkissaMirror = searchParams.get("mkissaMirror");
  if (mkissaMirror && isAllanimeMirrorId(mkissaMirror)) {
    target.mkissaMirror = mkissaMirror;
  }

  return target;
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

  if (mode === "multi") return false;

  if (!caps) return true;

  if (mode === "hardsub") return Boolean(caps.hardSub && caps.sub);
  if (mode === "dub") return supportsStreamAudioMode(caps, "dub");
  if (mode === "sub") return supportsStreamAudioMode(caps, "sub") && !caps.hardSub;

  return false;
}

export function resolveActiveStreamCapabilities(
  caps: EpisodeStreamCapabilities | undefined,
  provider: KittyProvider,
  audioMode: ProviderAudioMode,
  animexServer?: AnimexServerId,
  miruroPipe?: MiruroPipeProviderId,
  animoServer?: AnimoServerId,
  anisnatchServer?: AnisnatchServerId,
  lunarServer?: LunarServerId,
  allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): StreamCapabilities | null | undefined {
  if (!caps) return undefined;
  if (audioMode === "multi") {
    if (provider === "Miruro" && miruroPipe) return caps.miruroPipes[miruroPipe];
    if (provider === "Animex" && animexServer) return caps.animexServers[animexServer];
    if (provider === "AniSnatch" && anisnatchServer) return caps.anisnatchServers[anisnatchServer];
    if (provider === "Lunar" && lunarServer) return caps.lunarServers[lunarServer];
    if (provider === "AllAnime" && allanimeMirror) return caps.allanimeServers[allanimeMirror];
    if (provider === "MKissa" && mkissaMirror) return caps.mkissaServers[mkissaMirror];
  }
  if (provider === "Animo" && animoServer) return caps.animoServers[animoServer] ?? caps.providers[provider];
  return caps.providers[provider];
}

/** Whether this provider/pipe/server has a sub, soft-sub, or hard-sub stream for the episode. */
export function supportsStreamAudioMode(
  caps: StreamCapabilities | null | undefined,
  audio: "sub" | "dub",
): boolean {
  if (!caps) return false;
  if (audio === "dub") return caps.dub || caps.multi;
  return caps.sub || caps.softSub || caps.hardSub || caps.multi;
}

/** SUB/DUB toggle is useful when both audio modes are available (separate streams or dual-audio). */
export function canToggleStreamAudio(
  caps: StreamCapabilities | null | undefined,
): boolean {
  return supportsStreamAudioMode(caps, "sub") && supportsStreamAudioMode(caps, "dub");
}

export function selectionSupportsBothStreamAudioFromCaps(
  provider: KittyProvider,
  audioMode: ProviderAudioMode,
  caps: EpisodeStreamCapabilities | undefined,
  animexServer?: AnimexServerId,
  miruroPipe?: MiruroPipeProviderId,
  animoServer?: AnimoServerId,
  anisnatchServer?: AnisnatchServerId,
  lunarServer?: LunarServerId,
  allanimeMirror?: AllanimeMirrorId,
  mkissaMirror?: AllanimeMirrorId,
): boolean {
  const active = resolveActiveStreamCapabilities(
    caps,
    provider,
    audioMode,
    animexServer,
    miruroPipe,
    animoServer,
    anisnatchServer,
    lunarServer,
    allanimeMirror,
    mkissaMirror,
  );
  return canToggleStreamAudio(active);
}

export function animexServerUsesInPlayerAudioFromCaps(
  caps: StreamCapabilities | null | undefined,
): boolean {
  return Boolean(caps?.multi);
}
