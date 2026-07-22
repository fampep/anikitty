import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders } from "@/lib/kitty/kitty-api-core";
import { resolveKittyNamedStream } from "@/lib/kitty/kitty-provider-stream-resolve";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import {
  ANIKURO_SERVERS,
  anikuroServerDisplayLabel,
  DEFAULT_ANIKURO_SERVER,
  type AnikuroKittyServer,
  type AnikuroServerId,
  type AnikuroStreamResult,
} from "@/lib/providers/anikuro-config";

export * from "@/lib/providers/anikuro-config";

type AnikuroLinkId = {
  anilistId?: number;
  episode?: number;
  backend?: string;
  audio?: string;
};

function anikuroDataIds(
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

function serverMeta(serverId: AnikuroServerId) {
  return ANIKURO_SERVERS.find((server) => server.id === serverId);
}

export function parseAnikuroServerLabel(name: string): string {
  const trimmed = name.trim();
  const plain = trimmed.match(/^(.+?)\s*\((?:SUB|DUB|RAW|MULTI)\)/i);
  return (plain?.[1] ?? trimmed).trim() || trimmed;
}

function nameMatchesServer(serverId: AnikuroServerId, label: string): boolean {
  const meta = serverMeta(serverId);
  if (!meta) return false;
  const normalized = normalizeServerToken(parseAnikuroServerLabel(label));
  if (!normalized) return false;
  return meta.names.some((name) => normalizeServerToken(name) === normalized);
}

function serverMatchesRow(
  serverId: AnikuroServerId,
  link: AnikuroLinkId,
  rowName: string,
): boolean {
  if (link.backend === serverId) return true;
  return nameMatchesServer(serverId, rowName);
}

function normalizeStreamPayload(data: Record<string, unknown>): AnikuroStreamResult | null {
  const originalUrl = typeof data.originalUrl === "string" ? data.originalUrl.trim() : "";
  const file = typeof data.file === "string" ? data.file.trim() : "";
  const resolved = originalUrl || file;
  if (!resolved) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: resolved,
    headers: (data.headers as Record<string, string>) ?? {},
    tracks,
    allServers: Array.isArray(data.allServers) ? data.allServers : undefined,
    skipTimes: data.skipTimes as AnikuroStreamResult["skipTimes"],
    server: (data.serverName ?? data.server ?? null) as string | null,
    download: (data.download as string | null) ?? null,
  };
}

export async function fetchAnikuroServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnikuroKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: anikuroDataIds(opts.anilistId, opts.episode, opts.title),
    audio: opts.audio,
  });

  const res = await kittyApiFetch(
    `/provider/AniKuro/servers?${params.toString()}`,
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

async function fetchAnikuroStreamByLinkId(linkId: string): Promise<AnikuroStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await kittyApiFetch(
    `/provider/AniKuro/stream?${params.toString()}`,
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

async function fetchAnikuroStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnikuroStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/AniKuro/stream-direct?${params.toString()}`,
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

async function streamAnikuroViaServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId: AnikuroServerId;
  title?: string | null;
}): Promise<AnikuroStreamResult | null> {
  const servers = await fetchAnikuroServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as AnikuroLinkId;
      if (!serverMatchesRow(opts.serverId, link, row.name)) continue;
      const stream = await fetchAnikuroStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: anikuroServerDisplayLabel(opts.serverId) };
      }
    } catch {
      if (nameMatchesServer(opts.serverId, row.name)) {
        const stream = await fetchAnikuroStreamByLinkId(row.id);
        if (stream?.file) {
          return { ...stream, server: anikuroServerDisplayLabel(opts.serverId) };
        }
      }
    }
  }
  return null;
}

export async function fetchAnikuroVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: AnikuroServerId | null;
  title?: string | null;
}): Promise<AnikuroStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_ANIKURO_SERVER;

  // stream-direct first — constructed linkId often returns video without soft-sub tracks[].
  const result = await resolveKittyNamedStream({
    streamByLinkId: fetchAnikuroStreamByLinkId,
    streamDirect: () => fetchAnikuroStreamDirect(opts),
    streamViaServers: () => streamAnikuroViaServers({ ...opts, serverId }),
  });

  if (result?.file) {
    return { ...result, server: result.server ?? anikuroServerDisplayLabel(serverId) };
  }
  return result;
}
