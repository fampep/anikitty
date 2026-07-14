import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders, parseKittyStreamAudio } from "@/lib/kitty/kitty-api-core";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import {
  ANIWAVES_SERVERS,
  aniwavesServerDisplayLabel,
  DEFAULT_ANIWAVES_SERVER,
  isAniwavesServerId,
  type AniwavesKittyServer,
  type AniwavesServerId,
  type AniwavesStreamResult,
} from "@/lib/providers/aniwaves-config";

export * from "@/lib/providers/aniwaves-config";

type AniwavesLinkId = {
  linkId?: string;
  displayName?: string;
  targetType?: string;
  watchUrl?: string;
  svId?: string;
};

function aniwavesDataIds(
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

function serverMeta(serverId: AniwavesServerId) {
  return ANIWAVES_SERVERS.find((server) => server.id === serverId);
}

/** Strip trailing audio tags like "(SUB)" from Kitty server labels. */
export function parseAniwavesServerLabel(name: string): string {
  const trimmed = name.trim();
  const plain = trimmed.match(/^(.+?)\s*\((?:SUB|DUB|RAW|MULTI|SSUB)\)/i);
  return (plain?.[1] ?? trimmed).trim() || trimmed;
}

function nameMatchesServer(serverId: AniwavesServerId, label: string): boolean {
  const meta = serverMeta(serverId);
  if (!meta) return false;
  const normalized = normalizeServerToken(parseAniwavesServerLabel(label));
  if (!normalized) return false;
  return meta.names.some((name) => normalizeServerToken(name) === normalized);
}

function serverMatchesRow(
  serverId: AniwavesServerId,
  link: AniwavesLinkId,
  rowName: string,
): boolean {
  if (link.svId === serverId) return true;
  if (link.displayName && nameMatchesServer(serverId, link.displayName)) return true;
  return nameMatchesServer(serverId, rowName);
}

function normalizeStreamPayload(data: Record<string, unknown>): AniwavesStreamResult | null {
  const file = typeof data.file === "string" ? data.file.trim() : "";
  if (!file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file,
    headers: (data.headers as Record<string, string>) ?? {},
    tracks,
    allServers: Array.isArray(data.allServers) ? data.allServers : undefined,
    skipTimes: data.skipTimes as AniwavesStreamResult["skipTimes"],
    server: (data.serverName ?? data.server ?? null) as string | null,
    download: (data.download as string | null) ?? null,
    audio: parseKittyStreamAudio(data),
  };
}

export async function fetchAniwavesServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AniwavesKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: aniwavesDataIds(opts.anilistId, opts.episode, opts.title),
    audio: opts.audio,
  });

  const res = await kittyApiFetch(
    `/provider/AniWaves/servers?${params.toString()}`,
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

async function fetchAniwavesStreamByLinkId(linkId: string): Promise<AniwavesStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await kittyApiFetch(
    `/provider/AniWaves/stream?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data || typeof data !== "object") return null;
  return normalizeStreamPayload(data as Record<string, unknown>);
}

async function fetchAniwavesStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AniwavesStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/AniWaves/stream-direct?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data || typeof data !== "object") return null;
  return normalizeStreamPayload(data as Record<string, unknown>);
}

export function pickDefaultAniwavesServer(
  preferred?: AniwavesServerId | null,
): AniwavesServerId {
  if (preferred && isAniwavesServerId(preferred)) return preferred;
  return DEFAULT_ANIWAVES_SERVER;
}

/** Resolve a named AniWaves server via Kitty servers + stream, then stream-direct fallback. */
export async function fetchAniwavesVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AniwavesServerId | null;
  title?: string | null;
}): Promise<AniwavesStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANIWAVES_SERVER;

  const servers = await fetchAniwavesServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AniwavesLinkId;
      if (!serverMatchesRow(serverId, link, row.name)) continue;
      const stream = await fetchAniwavesStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: aniwavesServerDisplayLabel(serverId) };
      }
    } catch {
      if (nameMatchesServer(serverId, row.name)) {
        const stream = await fetchAniwavesStreamByLinkId(row.id);
        if (stream?.file) {
          return { ...stream, server: aniwavesServerDisplayLabel(serverId) };
        }
      }
    }
  }

  const direct = await fetchAniwavesStreamDirect(opts);
  if (direct?.file) {
    return { ...direct, server: aniwavesServerDisplayLabel(serverId) };
  }
  return direct;
}

export function countAniwavesSubtitleTracks(tracks: StreamTrack[] | undefined): number {
  if (!tracks?.length) return 0;
  return tracks.filter(isSubtitleTrack).length;
}
