import "server-only";
import {
  buildKittyStreamDirectPath,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";
import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import {
  anilistSiteSeriesUrl,
  isHardSubServerName,
  type AnilistSiteProviderId,
} from "@/lib/kitty/anilist-site-providers";
import type { AnilistSiteEpisode, AnilistSiteServer } from "@/lib/kitty/anilist-site-types";

export type { AnilistSiteEpisode, AnilistSiteServer };

export { isHardSubServerName };

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

/**
 * Prefer burned-in sub servers (`HS: …`) from site scrape.
 * Falls back to stream-direct when no hard-sub line is available.
 */
export async function fetchAnilistSiteHardSubStream(opts: {
  provider: AnilistSiteProviderId;
  anilistId: number;
  episode: number;
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  const timeoutMs = opts.timeoutMs ?? 25_000;

  const episodes = await fetchAnilistSiteEpisodes({
    provider: opts.provider,
    anilistId: opts.anilistId,
    audio: "sub",
    timeoutMs,
  });
  const ep = episodes.find((row) => row.number === opts.episode);
  if (!ep?.dataIds) {
    return fetchAnilistSiteStreamDirect({ ...opts, audio: "sub", timeoutMs });
  }

  const servers = await fetchAnilistSiteServers({
    provider: opts.provider,
    dataIds: ep.dataIds,
    audio: "sub",
    timeoutMs,
  });
  const hardSubServers = servers.filter((s) => isHardSubServerName(s.name));

  for (const server of hardSubServers) {
    const stream = await fetchAnilistSiteStream({
      provider: opts.provider,
      linkId: server.id,
      timeoutMs,
    });
    if (stream?.file) return stream;
  }

  return fetchAnilistSiteStreamDirect({ ...opts, audio: "sub", timeoutMs });
}
