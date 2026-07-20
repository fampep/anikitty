import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders } from "@/lib/kitty/kitty-api-core";
import { resolveKittyNamedStream } from "@/lib/kitty/kitty-provider-stream-resolve";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import {
  ANISNATCH_SERVERS,
  DEFAULT_ANISNATCH_SERVER,
  type AnisnatchKittyServer,
  type AnisnatchServerId,
  type AnisnatchStreamResult,
} from "@/lib/providers/anisnatch-config";

export * from "@/lib/providers/anisnatch-config";

type AnisnatchLinkId = {
  animeId?: string;
  ep?: number;
  audio?: string;
  source?: string;
  server?: string;
  name?: string;
};

function anisnatchDataIds(anilistId: number, episode: number): string {
  return JSON.stringify({ anilistId, ep: episode });
}

function serverMeta(serverId: AnisnatchServerId) {
  return ANISNATCH_SERVERS.find((s) => s.id === serverId);
}

function nameMatchesServer(serverId: AnisnatchServerId, label: string): boolean {
  const meta = serverMeta(serverId);
  if (!meta) return false;
  const normalized = label.trim();
  if (!normalized) return false;
  return meta.names.some(
    (n) =>
      normalized === n ||
      normalized.includes(` - ${n} `) ||
      normalized.includes(` - ${n}(`) ||
      normalized.endsWith(` - ${n}`),
  );
}

function serverMatchesRow(
  serverId: AnisnatchServerId,
  link: AnisnatchLinkId,
  rowName: string,
): boolean {
  if (link.name && nameMatchesServer(serverId, link.name)) return true;
  return nameMatchesServer(serverId, rowName);
}

export async function fetchAnisnatchServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnisnatchKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: anisnatchDataIds(opts.anilistId, opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/AniSnatch/servers?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: kittyStreamHeaders(),
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

async function fetchAnisnatchStreamByLinkId(linkId: string): Promise<AnisnatchStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await kittyApiFetch(
    `/provider/AniSnatch/stream?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
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

async function fetchAnisnatchStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnisnatchStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/AniSnatch/stream-direct?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
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

async function streamAnisnatchViaServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId: AnisnatchServerId;
  title?: string | null;
}): Promise<AnisnatchStreamResult | null> {
  const servers = await fetchAnisnatchServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AnisnatchLinkId;
      if (!serverMatchesRow(opts.serverId, link, row.name)) continue;
      const stream = await fetchAnisnatchStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: stream.server ?? row.name };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Resolve a named AniSnatch server via stream-direct, then servers list. */
export async function fetchAnisnatchVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AnisnatchServerId | null;
  title?: string | null;
}): Promise<AnisnatchStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANISNATCH_SERVER;

  return resolveKittyNamedStream({
    streamByLinkId: fetchAnisnatchStreamByLinkId,
    streamDirect: () => fetchAnisnatchStreamDirect(opts),
    streamViaServers: () => streamAnisnatchViaServers({ ...opts, serverId }),
  });
}

export type AnisnatchServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_ANISNATCH_CAPS: AnisnatchServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeAnisnatchCaps(...items: AnisnatchServerCapabilities[]): AnisnatchServerCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

function serversByAnisnatchId(
  rows: AnisnatchKittyServer[],
): Partial<Record<AnisnatchServerId, string>> {
  const map: Partial<Record<AnisnatchServerId, string>> = {};

  for (const row of rows) {
    try {
      const link = JSON.parse(row.id) as AnisnatchLinkId;
      for (const server of ANISNATCH_SERVERS) {
        if (serverMatchesRow(server.id, link, row.name) && !map[server.id]) {
          map[server.id] = row.id;
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}

function buildAnisnatchServerCapabilities(
  serverId: AnisnatchServerId,
  subLinks: Partial<Record<AnisnatchServerId, string>>,
  dubLinks: Partial<Record<AnisnatchServerId, string>>,
): AnisnatchServerCapabilities | null {
  const inSub = Boolean(subLinks[serverId]);
  const inDub = Boolean(dubLinks[serverId]);
  if (!inSub && !inDub) return null;

  return {
    sub: inSub,
    dub: inDub,
    multi: inSub && inDub,
    softSub: false,
    hardSub: inSub,
  };
}

/** Probe one AniSnatch server for sub/dub availability on an episode. */
export async function probeAnisnatchServerCapabilities(
  anilistId: number,
  episode: number,
  serverId: AnisnatchServerId,
  title?: string | null,
): Promise<AnisnatchServerCapabilities> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnisnatchServers({ anilistId, episode, audio: "sub", title }).then(serversByAnisnatchId),
    fetchAnisnatchServers({ anilistId, episode, audio: "dub", title }).then(serversByAnisnatchId),
  ]);

  const caps = buildAnisnatchServerCapabilities(serverId, subLinks, dubLinks);
  return caps ?? EMPTY_ANISNATCH_CAPS;
}

/** Per-server sub/dub from AniSnatch servers list. */
export async function probeAnisnatchEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: AnisnatchServerCapabilities;
  servers: Partial<Record<AnisnatchServerId, AnisnatchServerCapabilities>>;
}> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchAnisnatchServers({ anilistId, episode, audio: "sub", title }).then(serversByAnisnatchId),
    fetchAnisnatchServers({ anilistId, episode, audio: "dub", title }).then(serversByAnisnatchId),
  ]);

  const servers: Partial<Record<AnisnatchServerId, AnisnatchServerCapabilities>> = {};
  let provider = EMPTY_ANISNATCH_CAPS;

  for (const server of ANISNATCH_SERVERS) {
    const caps = buildAnisnatchServerCapabilities(server.id, subLinks, dubLinks);
    if (!caps) continue;
    servers[server.id] = caps;
    provider = mergeAnisnatchCaps(provider, caps);
  }

  return { provider, servers };
}
