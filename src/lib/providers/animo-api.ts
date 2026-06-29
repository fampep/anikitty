import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty/kitty-api";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-api";

/** 4animo.xyz embed servers (cdn.4animo.xyz). */
export const ANIMO_SERVERS = [
  { id: "hd-1", label: "HD-1", hint: "Default · anime ID + episode" },
  { id: "hd-2", label: "HD-2", hint: "Per-episode embed_id" },
  { id: "hd-3", label: "HD-3", hint: "Same path as HD-1" },
] as const;

export type AnimoServerId = (typeof ANIMO_SERVERS)[number]["id"];

export const DEFAULT_ANIMO_SERVER: AnimoServerId = "hd-1";

export type AnimoKittyServer = {
  id: string;
  name: string;
};

export type AnimoStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

type AnimoLinkId = {
  server?: string;
  slug?: string;
  animeId?: string;
  episode?: number;
  embedId?: string;
  lang?: string;
};

function animoDataIds(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): string {
  const payload: Record<string, unknown> = {
    anilistId,
    episode,
    lang: audio,
  };
  if (title?.trim()) payload.title = title.trim();
  return JSON.stringify(payload);
}

export function isAnimoServerId(value: string): value is AnimoServerId {
  return ANIMO_SERVERS.some((s) => s.id === value);
}

function normalizeServerToken(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function serverMatchesLink(
  serverId: AnimoServerId,
  link: AnimoLinkId,
  rowName: string,
): boolean {
  const want = normalizeServerToken(serverId);
  if (link.server && normalizeServerToken(link.server) === want) return true;
  const name = normalizeServerToken(rowName);
  if (name === want || name.includes(want)) return true;
  return false;
}

export async function fetchAnimoServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnimoKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: animoDataIds(opts.anilistId, opts.episode, opts.audio, opts.title),
    audio: opts.audio,
  });

  const res = await fetch(
    `${getKittyApiBase()}/provider/Animo/servers?${params.toString()}`,
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

async function fetchAnimoStreamByLinkId(linkId: string): Promise<AnimoStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await fetch(
    `${getKittyApiBase()}/provider/Animo/stream?${params.toString()}`,
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

async function fetchAnimoStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnimoStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await fetch(
    `${getKittyApiBase()}/provider/Animo/stream-direct?${params.toString()}`,
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

/** Resolve a named Animo server via Kitty servers + stream, then stream-direct fallback. */
export async function fetchAnimoVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AnimoServerId | null;
  title?: string | null;
}): Promise<AnimoStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANIMO_SERVER;

  const servers = await fetchAnimoServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AnimoLinkId;
      if (!serverMatchesLink(serverId, link, row.name)) continue;
      const stream = await fetchAnimoStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: stream.server ?? row.name };
      }
    } catch {
      continue;
    }
  }

  // Kitty stream-direct tries HD-1 → HD-2 → HD-3 when servers list is empty or unmatched.
  return fetchAnimoStreamDirect(opts);
}

export type AnimoServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_ANIMO_CAPS: AnimoServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeAnimoCaps(...items: AnimoServerCapabilities[]): AnimoServerCapabilities {
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

function serversByAnimoId(
  rows: AnimoKittyServer[],
): Partial<Record<AnimoServerId, string>> {
  const map: Partial<Record<AnimoServerId, string>> = {};

  for (const row of rows) {
    try {
      const link = JSON.parse(row.id) as AnimoLinkId;
      for (const server of ANIMO_SERVERS) {
        if (serverMatchesLink(server.id, link, row.name) && !map[server.id]) {
          map[server.id] = row.id;
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}

async function probeAnimoLinkStream(linkId: string): Promise<{
  file?: string;
  subtitleTracks: number;
} | null> {
  const stream = await fetchAnimoStreamByLinkId(linkId);
  if (!stream?.file) return null;

  return {
    file: stream.file,
    subtitleTracks: countSubtitleTracks(stream.tracks),
  };
}

async function buildAnimoServerCapabilities(
  serverId: AnimoServerId,
  subLinks: Partial<Record<AnimoServerId, string>>,
  dubLinks: Partial<Record<AnimoServerId, string>>,
): Promise<AnimoServerCapabilities | null> {
  const subLinkId = subLinks[serverId];
  const dubLinkId = dubLinks[serverId];
  const inSub = Boolean(subLinkId);
  const inDub = Boolean(dubLinkId);

  if (!inSub && !inDub) return null;

  const [subProbe, dubProbe] = await Promise.all([
    inSub && subLinkId ? probeAnimoLinkStream(subLinkId) : Promise.resolve(null),
    inDub && dubLinkId ? probeAnimoLinkStream(dubLinkId) : Promise.resolve(null),
  ]);

  const softSub = (subProbe?.subtitleTracks ?? 0) > 0 || (dubProbe?.subtitleTracks ?? 0) > 0;

  return {
    sub: inSub,
    dub: inDub,
    multi: false,
    softSub,
    hardSub: inSub && !softSub,
  };
}

/** Probe one Animo server for sub/dub/soft-sub on an episode. */
export async function probeAnimoServerCapabilities(
  anilistId: number,
  episode: number,
  serverId: AnimoServerId,
  title?: string | null,
): Promise<AnimoServerCapabilities> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnimoServers({ anilistId, episode, audio: "sub", title }).then(serversByAnimoId),
    fetchAnimoServers({ anilistId, episode, audio: "dub", title }).then(serversByAnimoId),
  ]);

  const caps = await buildAnimoServerCapabilities(serverId, subLinks, dubLinks);
  if (caps) return caps;

  const [subProbe, dubProbe] = await Promise.all([
    probeStreamDirect(anilistId, episode, "sub", title),
    probeStreamDirect(anilistId, episode, "dub", title),
  ]);

  if (!subProbe && !dubProbe) return EMPTY_ANIMO_CAPS;

  const softSub = (subProbe?.subtitleTracks ?? 0) > 0 || (dubProbe?.subtitleTracks ?? 0) > 0;
  return {
    sub: Boolean(subProbe?.hasFile),
    dub: Boolean(dubProbe?.hasFile),
    multi: false,
    softSub,
    hardSub: Boolean(subProbe?.hasFile) && !softSub,
  };
}

async function probeStreamDirect(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): Promise<{ hasFile: boolean; subtitleTracks: number } | null> {
  const stream = await fetchAnimoStreamDirect({ anilistId, episode, audio, title });
  if (!stream?.file) return { hasFile: false, subtitleTracks: 0 };
  return {
    hasFile: true,
    subtitleTracks: countSubtitleTracks(stream.tracks),
  };
}

/** Per-server capabilities for Animo (HD-1 / HD-2 / HD-3). */
export async function probeAnimoEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: AnimoServerCapabilities;
  servers: Partial<Record<AnimoServerId, AnimoServerCapabilities>>;
}> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnimoServers({ anilistId, episode, audio: "sub", title }).then(serversByAnimoId),
    fetchAnimoServers({ anilistId, episode, audio: "dub", title }).then(serversByAnimoId),
  ]);

  const serverResults = await Promise.all(
    ANIMO_SERVERS.map(async (server) => {
      const caps = await buildAnimoServerCapabilities(server.id, subLinks, dubLinks);
      if (!caps) return null;
      return { id: server.id, caps };
    }),
  );

  const servers: Partial<Record<AnimoServerId, AnimoServerCapabilities>> = {};
  let provider = EMPTY_ANIMO_CAPS;

  for (const row of serverResults) {
    if (!row) continue;
    servers[row.id] = row.caps;
    provider = mergeAnimoCaps(provider, row.caps);
  }

  if (Object.keys(servers).length === 0) {
    const fallback = await probeAnimoServerCapabilities(
      anilistId,
      episode,
      DEFAULT_ANIMO_SERVER,
      title,
    );
    provider = fallback;
    servers[DEFAULT_ANIMO_SERVER] = fallback;
  }

  return { provider, servers };
}
