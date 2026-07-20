import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders, parseKittyStreamAudio } from "@/lib/kitty/kitty-api-core";
import { resolveKittyNamedStream } from "@/lib/kitty/kitty-provider-stream-resolve";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import {
  ANINEKO_SERVERS,
  DEFAULT_ANINEKO_SERVER,
  isAninekoServerId,
  type AninekoKittyServer,
  type AninekoServerId,
  type AninekoStreamResult,
} from "@/lib/providers/anineko-config";

export * from "@/lib/providers/anineko-config";

type AninekoLinkId = {
  server?: string;
  source?: string;
  name?: string;
};

function aninekoDataIds(
  anilistId: number,
  episode: number,
  title?: string | null,
): string {
  const payload: Record<string, unknown> = { anilistId, episode };
  if (title?.trim()) payload.title = title.trim();
  return JSON.stringify(payload);
}

function normalizeServerToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function serverMeta(serverId: AninekoServerId) {
  return ANINEKO_SERVERS.find((server) => server.id === serverId);
}

/** Strip trailing audio tags like "(SUB)" from Kitty server labels. */
export function parseAninekoServerLabel(name: string): string {
  const trimmed = name.trim();
  const plain = trimmed.match(/^(.+?)\s*\((?:SUB|DUB|RAW|MULTI)\)/i);
  return (plain?.[1] ?? trimmed).trim() || trimmed;
}

function nameMatchesServer(serverId: AninekoServerId, label: string): boolean {
  const meta = serverMeta(serverId);
  if (!meta) return false;
  const normalized = normalizeServerToken(parseAninekoServerLabel(label));
  if (!normalized) return false;
  return meta.names.some((name) => normalizeServerToken(name) === normalized);
}

function serverMatchesRow(
  serverId: AninekoServerId,
  link: AninekoLinkId,
  rowName: string,
): boolean {
  if (link.server && nameMatchesServer(serverId, link.server)) return true;
  if (link.name && nameMatchesServer(serverId, link.name)) return true;
  if (link.source && nameMatchesServer(serverId, link.source)) return true;
  return nameMatchesServer(serverId, rowName);
}

export async function fetchAninekoServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AninekoKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: aninekoDataIds(opts.anilistId, opts.episode, opts.title),
    audio: opts.audio,
  });

  const res = await kittyApiFetch(
    `/provider/AniNeko/servers?${params.toString()}`,
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

async function fetchAninekoStreamByLinkId(linkId: string): Promise<AninekoStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await kittyApiFetch(
    `/provider/AniNeko/stream?${params.toString()}`,
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
    allServers: Array.isArray(data.allServers) ? data.allServers : undefined,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
    audio: parseKittyStreamAudio(data),
  };
}

async function fetchAninekoStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AninekoStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/AniNeko/stream-direct?${params.toString()}`,
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
    allServers: Array.isArray(data.allServers) ? data.allServers : undefined,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
    audio: parseKittyStreamAudio(data),
  };
}

export function pickDefaultAninekoServer(
  preferred?: AninekoServerId | null,
): AninekoServerId {
  if (preferred && isAninekoServerId(preferred)) return preferred;
  return DEFAULT_ANINEKO_SERVER;
}

async function streamAninekoViaServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId: AninekoServerId;
  title?: string | null;
}): Promise<AninekoStreamResult | null> {
  const servers = await fetchAninekoServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AninekoLinkId;
      if (!serverMatchesRow(opts.serverId, link, row.name)) continue;
      const stream = await fetchAninekoStreamByLinkId(row.id);
      if (stream?.file) {
        const meta = serverMeta(opts.serverId);
        return { ...stream, server: stream.server ?? meta?.label ?? row.name };
      }
    } catch {
      if (nameMatchesServer(opts.serverId, row.name)) {
        const stream = await fetchAninekoStreamByLinkId(row.id);
        if (stream?.file) {
          const meta = serverMeta(opts.serverId);
          return { ...stream, server: stream.server ?? meta?.label ?? row.name };
        }
      }
    }
  }
  return null;
}

/** Resolve a named AniNeko server via stream-direct, then servers list. */
export async function fetchAninekoVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AninekoServerId | null;
  title?: string | null;
}): Promise<AninekoStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANINEKO_SERVER;

  return resolveKittyNamedStream({
    streamByLinkId: fetchAninekoStreamByLinkId,
    streamDirect: () => fetchAninekoStreamDirect(opts),
    streamViaServers: () => streamAninekoViaServers({ ...opts, serverId }),
  });
}

export function countAninekoSubtitleTracks(tracks: StreamTrack[] | undefined): number {
  if (!tracks?.length) return 0;
  return tracks.filter(isSubtitleTrack).length;
}
