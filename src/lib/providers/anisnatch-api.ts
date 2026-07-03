import { getKittyApiBase, kittyStreamHeaders } from "@/lib/kitty/kitty-api";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-api";

/** Known AniSnatch mirrors (SUB list; DUB uses site-specific names matched the same way). */
export const ANISNATCH_SERVERS = [
  { id: "anivibe", label: "AniVibe", hint: "vivibebe.site · HLS · fastest", names: ["AniVibe"] },
  { id: "nekovibe", label: "NekoVibe", hint: "bibiemb · alternate Vibe", names: ["NekoVibe"] },
  { id: "kwik", label: "Kwik", hint: "kwik.cx · 360/720/1080", names: ["Kwik"] },
  { id: "anibd", label: "AniBD", hint: "PlayEng · BD", names: ["AniBD"] },
  { id: "aniyt", label: "AniYT", hint: "YouTube MP4", names: ["AniYT"] },
  { id: "aniara", label: "AniAra", hint: "Video proxy", names: ["AniAra"] },
  { id: "okcdn", label: "OkCdn", hint: "AllManga-style CDN", names: ["OkCdn", "Ok CDN"] },
  { id: "mp4", label: "MP4", hint: "Direct MP4", names: ["MP4"] },
  { id: "megaplay", label: "Megaplay", hint: "Megaplay embed", names: ["Megaplay", "MegaPlay"] },
  { id: "vidwish", label: "Vidwish", hint: "Vidwish embed", names: ["Vidwish"] },
  { id: "onsen", label: "Onsen", hint: "Onsen embed", names: ["Onsen"] },
] as const;

export type AnisnatchServerId = (typeof ANISNATCH_SERVERS)[number]["id"];

export const DEFAULT_ANISNATCH_SERVER: AnisnatchServerId = "anivibe";

export type AnisnatchKittyServer = {
  id: string;
  name: string;
};

export type AnisnatchStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

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

export function isAnisnatchServerId(value: string): value is AnisnatchServerId {
  return ANISNATCH_SERVERS.some((s) => s.id === value);
}

export function defaultAnisnatchServerForMode(_mode: ProviderAudioMode): AnisnatchServerId {
  return DEFAULT_ANISNATCH_SERVER;
}

export function anisnatchServerSupportsBothStreamAudio(_serverId: AnisnatchServerId): boolean {
  return true;
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

  const res = await fetch(
    `${getKittyApiBase()}/provider/AniSnatch/servers?${params.toString()}`,
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
  const res = await fetch(
    `${getKittyApiBase()}/provider/AniSnatch/stream?${params.toString()}`,
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

  const res = await fetch(
    `${getKittyApiBase()}/provider/AniSnatch/stream-direct?${params.toString()}`,
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

/** Resolve a named AniSnatch server via Kitty servers + stream endpoints. */
export async function fetchAnisnatchVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AnisnatchServerId | null;
  title?: string | null;
}): Promise<AnisnatchStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANISNATCH_SERVER;

  const servers = await fetchAnisnatchServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AnisnatchLinkId;
      if (!serverMatchesRow(serverId, link, row.name)) continue;
      const stream = await fetchAnisnatchStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: stream.server ?? row.name };
      }
    } catch {
      continue;
    }
  }

  return fetchAnisnatchStreamDirect(opts);
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
