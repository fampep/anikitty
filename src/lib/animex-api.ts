import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty-api";
import type { StreamTrack } from "@/lib/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/miruro-api";

/** animex.one servers exposed by Kitty API (providerId / source). */
export const ANIMEX_SERVERS = [
  { id: "zen", label: "Zen", hint: "FlixCloud · dual audio" },
  { id: "koto", label: "Koto", hint: "MegaPlay · sub/dub" },
  { id: "beep", label: "Beep", hint: "Soft sub · CDN" },
  { id: "mimi", label: "Mimi", hint: "Hard sub · fast" },
  { id: "yuki", label: "Yuki", hint: "Soft sub · multi quality" },
  { id: "uwu", label: "Uwu", hint: "Hard sub" },
  { id: "mochi", label: "Mochi", hint: "Hard sub" },
  { id: "neko", label: "Neko", hint: "MP4 / HLS · hard sub" },
  { id: "sax", label: "Sax", hint: "ok.ru embed" },
  { id: "yume", label: "Yume", hint: "mp4upload embed" },
  { id: "kiwi", label: "Kiwi", hint: "Nekostream mapper" },
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
