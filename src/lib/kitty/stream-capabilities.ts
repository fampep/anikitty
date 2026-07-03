import { buildKittyStreamDirectUrl, kittyStreamHeaders } from "@/lib/kitty/kitty-api";
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
  probeMiruroPipeCapabilities,
  type MiruroPipeProviderId,
} from "@/lib/providers/miruro-api";
import {
  isKittyProvider,
  MULTI_ROW_PROVIDERS,
  providerSupportsDub,
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

const PROBE_TIMEOUT_MS = 8_000;

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
      headers: kittyStreamHeaders(),
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
  const subProbe = await probeStreamDirect(provider, anilistId, episode, "sub", title);
  const dubProbe = providerSupportsDub(provider)
    ? await probeStreamDirect(provider, anilistId, episode, "dub", title)
    : null;
  const caps = capabilitiesFromProbes(subProbe, dubProbe);
  if (MULTI_ROW_PROVIDERS.has(provider) && provider !== "AniSnatch" && provider !== "Lunar" && provider !== "AllAnime" && provider !== "MKissa" && caps.sub && caps.dub) {
    return { ...caps, multi: true };
  }
  return caps;
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

  if (mode === "multi" || mode === "dub") return false;

  if (!caps) return mode === "sub";

  return providerHasStreamCapabilities(caps);
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
