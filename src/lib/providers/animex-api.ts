import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty/kitty-api";
import { getKittyProviderMeta, type KittyProvider, type ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-api";

/** animex.one servers exposed by Kitty API (providerId / source). */
export const ANIMEX_SERVERS = [
  { id: "zen", label: "Zen", hint: "FlixCloud · dual audio", modes: ["multi"] as const },
  { id: "koto", label: "Koto", hint: "MegaPlay · sub/dub", modes: ["sub", "dub"] as const },
  { id: "beep", label: "Beep", hint: "pp.animex.one · soft sub", modes: ["sub", "dub"] as const },
  { id: "mimi", label: "Mimi", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "yuki", label: "Yuki", hint: "Hawk CDN · soft sub", modes: ["sub", "dub"] as const },
  { id: "uwu", label: "Uwu", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "mochi", label: "Mochi", hint: "Hawk CDN · hard sub", modes: ["sub", "dub"] as const },
  { id: "neko", label: "Neko", hint: "Direct MP4/HLS · hard sub", modes: ["sub", "dub"] as const },
  { id: "sax", label: "Sax", hint: "ok.ru embed", modes: ["sub", "dub"] as const },
  { id: "yume", label: "Yume", hint: "mp4upload embed", modes: ["sub", "dub"] as const },
  { id: "kiwi", label: "Kiwi", hint: "Nekostream mapper", modes: ["sub"] as const },
] as const;

export type AnimexServerId = (typeof ANIMEX_SERVERS)[number]["id"];

export const DEFAULT_ANIMEX_SERVER: AnimexServerId = "zen";

export type AnimexKittyServer = {
  id: string;
  name: string;
};

export type AnimexStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

function animexDataIds(anilistId: number, episode: number): string {
  return JSON.stringify({ anilistId, epNum: episode });
}

export function isAnimexServerId(value: string): value is AnimexServerId {
  return ANIMEX_SERVERS.some((s) => s.id === value);
}

export function animexServersForAudioMode(mode: ProviderAudioMode) {
  return ANIMEX_SERVERS.filter((s) => (s.modes as readonly ProviderAudioMode[]).includes(mode));
}

/** Default Animex server when entering a row from the generic Animex provider pill. */
export function defaultAnimexServerForMode(mode: ProviderAudioMode): AnimexServerId {
  if (mode === "multi") return "zen";
  if (mode === "dub") return "koto";
  return "beep";
}

/** Dual-audio embed (e.g. Zen) — switch tracks in the player, not via stream refetch. */
export function animexServerUsesInPlayerAudioSwitch(serverId: AnimexServerId): boolean {
  const server = ANIMEX_SERVERS.find((s) => s.id === serverId);
  return (server?.modes as readonly ProviderAudioMode[] | undefined)?.includes("multi") ?? false;
}

export function animexServerSupportsBothStreamAudio(serverId: AnimexServerId): boolean {
  const server = ANIMEX_SERVERS.find((s) => s.id === serverId);
  if (!server) return false;
  const modes = server.modes as readonly ProviderAudioMode[];
  if (modes.includes("multi")) return true;
  return modes.includes("sub") && modes.includes("dub");
}

/** Current provider selection exposes both SUB and DUB (or dual-audio in one stream). */
export function selectionSupportsBothStreamAudio(opts: {
  provider: KittyProvider;
  audioMode: ProviderAudioMode;
  animexServer?: AnimexServerId;
}): boolean {
  if (opts.audioMode === "multi") {
    if (opts.provider === "Miruro") return true;
    if (opts.provider === "AniSnatch") return true;
    if (opts.provider === "Animex" && opts.animexServer) {
      return animexServerSupportsBothStreamAudio(opts.animexServer);
    }
    return false;
  }
  return getKittyProviderMeta(opts.provider).supportsDub === true;
}

type AnimexLinkId = {
  source?: string;
  providerId?: string;
};

function serverMatchesLink(serverId: AnimexServerId, link: AnimexLinkId): boolean {
  if (serverId === "zen") return link.source === "flix";
  if (serverId === "koto") return link.source === "megaplay";
  return link.source === "hawk" && link.providerId === serverId;
}

export async function fetchAnimexServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
}): Promise<AnimexKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: animexDataIds(opts.anilistId, opts.episode),
    audio: opts.audio,
  });

  const res = await fetch(
    `${getKittyApiBase()}/provider/Animex/servers?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: kittyApiHeaders(),
    },
  );

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => ({
      id: String(row?.id ?? ""),
      name: String(row?.name ?? "").trim(),
    }))
    .filter((row) => row.id && row.name);
}

async function fetchAnimexStreamByLinkId(linkId: string): Promise<AnimexStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await fetch(
    `${getKittyApiBase()}/provider/Animex/stream?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyApiHeaders(),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
  };
}

async function fetchAnimexStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnimexStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await fetch(
    `${getKittyApiBase()}/provider/Animex/stream-direct?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyApiHeaders(),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
  };
}

/** Resolve a named Animex server via Kitty servers + stream endpoints. */
export async function fetchAnimexVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AnimexServerId | null;
  title?: string | null;
}): Promise<AnimexStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANIMEX_SERVER;

  const servers = await fetchAnimexServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AnimexLinkId;
      if (!serverMatchesLink(serverId, link)) continue;
      const stream = await fetchAnimexStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: stream.server ?? row.name };
      }
    } catch {
      continue;
    }
  }

  return fetchAnimexStreamDirect(opts);
}

export type AnimexServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_ANIMEX_CAPS: AnimexServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeAnimexCaps(...items: AnimexServerCapabilities[]): AnimexServerCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

function countSubtitleTracks(tracks: StreamTrack[] | undefined): number {
  if (!tracks?.length) return 0;
  return tracks.filter(isSubtitleTrack).length;
}

function serversByAnimexId(
  rows: AnimexKittyServer[],
): Partial<Record<AnimexServerId, string>> {
  const map: Partial<Record<AnimexServerId, string>> = {};

  for (const row of rows) {
    try {
      const link = JSON.parse(row.id) as AnimexLinkId;
      for (const server of ANIMEX_SERVERS) {
        if (serverMatchesLink(server.id, link) && !map[server.id]) {
          map[server.id] = row.id;
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}

async function probeAnimexLinkStream(linkId: string): Promise<{
  file?: string;
  subtitleTracks: number;
  multiAudio: boolean;
} | null> {
  const stream = await fetchAnimexStreamByLinkId(linkId);
  if (!stream?.file) return null;

  return {
    file: stream.file,
    subtitleTracks: countSubtitleTracks(stream.tracks),
    multiAudio: false,
  };
}

async function buildAnimexServerCapabilities(
  serverId: AnimexServerId,
  subLinks: Partial<Record<AnimexServerId, string>>,
  dubLinks: Partial<Record<AnimexServerId, string>>,
): Promise<AnimexServerCapabilities | null> {
  const subLinkId = subLinks[serverId];
  const dubLinkId = dubLinks[serverId];
  const inSub = Boolean(subLinkId);
  const inDub = Boolean(dubLinkId);

  if (!inSub && !inDub) return null;

  let softSub = false;
  let hardSub = false;
  let multi = false;

  const [subProbe, dubProbe] = await Promise.all([
    inSub && subLinkId ? probeAnimexLinkStream(subLinkId) : Promise.resolve(null),
    inDub && dubLinkId ? probeAnimexLinkStream(dubLinkId) : Promise.resolve(null),
  ]);

  if (subProbe) {
    softSub = subProbe.subtitleTracks > 0;
    hardSub = !softSub;
  }

  if (subProbe?.file && dubProbe?.file) {
    multi = serverId === "zen" || subProbe.file === dubProbe.file;
  } else if (serverId === "zen" && (subProbe?.file || dubProbe?.file)) {
    multi = true;
  }

  return {
    sub: inSub,
    dub: inDub,
    multi: multi || (inSub && inDub),
    softSub,
    hardSub: inSub && !softSub,
  };
}

/** Probe one Animex server for sub/dub/hardsub on an episode. */
export async function probeAnimexServerCapabilities(
  anilistId: number,
  episode: number,
  serverId: AnimexServerId,
): Promise<AnimexServerCapabilities> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnimexServers({ anilistId, episode, audio: "sub" }).then(serversByAnimexId),
    fetchAnimexServers({ anilistId, episode, audio: "dub" }).then(serversByAnimexId),
  ]);

  const caps = await buildAnimexServerCapabilities(serverId, subLinks, dubLinks);
  return caps ?? EMPTY_ANIMEX_CAPS;
}

/** Per-server sub/dub/hardsub from Animex servers list + stream probes. */
export async function probeAnimexEpisodeCapabilities(
  anilistId: number,
  episode: number,
  _title?: string | null,
): Promise<{
  provider: AnimexServerCapabilities;
  servers: Partial<Record<AnimexServerId, AnimexServerCapabilities>>;
}> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnimexServers({ anilistId, episode, audio: "sub" }).then(serversByAnimexId),
    fetchAnimexServers({ anilistId, episode, audio: "dub" }).then(serversByAnimexId),
  ]);

  const serverResults = await Promise.all(
    ANIMEX_SERVERS.map(async (server) => {
      const caps = await buildAnimexServerCapabilities(server.id, subLinks, dubLinks);
      if (!caps) return null;
      return { id: server.id, caps };
    }),
  );

  const servers: Partial<Record<AnimexServerId, AnimexServerCapabilities>> = {};
  let provider = EMPTY_ANIMEX_CAPS;

  for (const row of serverResults) {
    if (!row) continue;
    servers[row.id] = row.caps;
    provider = mergeAnimexCaps(provider, row.caps);
  }

  return { provider, servers };
}
