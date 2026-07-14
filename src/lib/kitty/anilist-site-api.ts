import {
  buildKittyStreamDirectPath,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";
import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import {
  anilistSiteSeriesUrl,
  type AnilistSiteProviderId,
} from "@/lib/kitty/anilist-site-providers";

export type AnilistSiteEpisode = {
  number: number;
  title?: string;
  hasSub?: boolean;
  hasDub?: boolean;
  /** Opaque JSON from KittyAPI — pass unchanged to `/servers`. */
  dataIds?: string;
  url?: string;
};

export type AnilistSiteServer = {
  name: string;
  /** Opaque JSON from KittyAPI — pass unchanged to `/stream`. */
  id: string;
};

export function buildAnilistSiteEpisodesPath(
  provider: AnilistSiteProviderId,
  opts: { anilistId: number; audio?: "sub" | "dub" },
): string {
  const params = new URLSearchParams({
    seriesUrl: anilistSiteSeriesUrl(opts.anilistId),
  });
  if (opts.audio) params.set("audio", opts.audio);
  return `/provider/${provider}/episodes?${params.toString()}`;
}

export function buildAnilistSiteServersPath(
  provider: AnilistSiteProviderId,
  dataIds: string,
  audio: "sub" | "dub",
): string {
  const params = new URLSearchParams({ dataIds, audio });
  return `/provider/${provider}/servers?${params.toString()}`;
}

export function buildAnilistSiteStreamPath(provider: AnilistSiteProviderId, linkId: string): string {
  const params = new URLSearchParams({ linkId });
  return `/provider/${provider}/stream?${params.toString()}`;
}

export function buildAnilistSiteStreamDirectPath(opts: {
  provider: AnilistSiteProviderId;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  return buildKittyStreamDirectPath({
    provider: opts.provider,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });
}

function normalizeEpisodes(data: unknown): AnilistSiteEpisode[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { episodes?: unknown })?.episodes)
      ? (data as { episodes: unknown[] }).episodes
      : [];

  const episodes: AnilistSiteEpisode[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const ep = row as Record<string, unknown>;
    const number = Number(ep.number ?? ep.episode ?? ep.ep);
    if (!Number.isFinite(number) || number <= 0) continue;

    episodes.push({
      number,
      ...(typeof ep.title === "string" ? { title: ep.title } : {}),
      ...(ep.hasSub === true || ep.hasSub === 1 ? { hasSub: true } : {}),
      ...(ep.hasDub === true || ep.hasDub === 1 ? { hasDub: true } : {}),
      ...(typeof ep.dataIds === "string"
        ? { dataIds: ep.dataIds }
        : ep.dataIds != null
          ? { dataIds: JSON.stringify(ep.dataIds) }
          : {}),
      ...(typeof ep.url === "string" ? { url: ep.url } : {}),
    });
  }
  return episodes;
}

function normalizeServers(data: unknown): AnilistSiteServer[] {
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const server = row as Record<string, unknown>;
      const id = typeof server.id === "string" ? server.id : null;
      const name = typeof server.name === "string" ? server.name : null;
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((s): s is AnilistSiteServer => s != null);
}

export async function fetchAnilistSiteEpisodes(opts: {
  provider: AnilistSiteProviderId;
  anilistId: number;
  audio?: "sub" | "dub";
  timeoutMs?: number;
}): Promise<AnilistSiteEpisode[]> {
  try {
    const res = await kittyApiFetch(buildAnilistSiteEpisodesPath(opts.provider, opts), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    if (!res.ok) return [];
    return normalizeEpisodes(await res.json());
  } catch {
    return [];
  }
}

export async function fetchAnilistSiteServers(opts: {
  provider: AnilistSiteProviderId;
  dataIds: string;
  audio: "sub" | "dub";
  timeoutMs?: number;
}): Promise<AnilistSiteServer[]> {
  try {
    const res = await kittyApiFetch(
      buildAnilistSiteServersPath(opts.provider, opts.dataIds, opts.audio),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      },
    );
    if (!res.ok) return [];
    return normalizeServers(await res.json());
  } catch {
    return [];
  }
}

export async function fetchAnilistSiteStream(opts: {
  provider: AnilistSiteProviderId;
  linkId: string;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  try {
    const res = await kittyApiFetch(buildAnilistSiteStreamPath(opts.provider, opts.linkId), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/** One-call playback — AniList match + site scrape + stream inside KittyAPI. */
export async function fetchAnilistSiteStreamDirect(opts: {
  provider: AnilistSiteProviderId;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  try {
    const res = await kittyApiFetch(buildAnilistSiteStreamDirectPath(opts), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}
