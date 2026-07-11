import {
  buildKittyStreamDirectPath,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";
import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { MEGAPLAY_PROVIDER_ID } from "@/lib/kitty/megaplay-providers";

/** `seriesUrl` for `/episodes` — prefer AniList IDs from your DB. */
export type MegaplaySeriesUrl = `anilist:${number}` | `catalog:${number}`;

export type MegaplayEpisode = {
  number: number;
  title?: string;
  hasSub?: boolean;
  hasDub?: boolean;
  /** Opaque JSON from KittyAPI — pass unchanged to `/servers`. */
  dataIds?: string;
  url?: string;
};

export type MegaplayServer = {
  name: string;
  /** Opaque JSON from KittyAPI — pass unchanged to `/stream`. */
  id: string;
};

const MEGAPLAY = MEGAPLAY_PROVIDER_ID;

export function megaplayAnilistSeriesUrl(anilistId: number): MegaplaySeriesUrl {
  return `anilist:${anilistId}`;
}

export function buildMegaplayEpisodesPath(opts: {
  anilistId: number;
  audio?: "sub" | "dub";
}): string {
  const params = new URLSearchParams({
    seriesUrl: megaplayAnilistSeriesUrl(opts.anilistId),
  });
  if (opts.audio) params.set("audio", opts.audio);
  return `/provider/${MEGAPLAY}/episodes?${params.toString()}`;
}

/** Pass `dataIds` exactly as returned on the episode row. */
export function buildMegaplayServersPath(
  dataIds: string,
  audio: "sub" | "dub",
): string {
  const params = new URLSearchParams({ dataIds, audio });
  return `/provider/${MEGAPLAY}/servers?${params.toString()}`;
}

/** Pass `linkId` exactly as returned in `server.id`. */
export function buildMegaplayStreamPath(linkId: string): string {
  const params = new URLSearchParams({ linkId });
  return `/provider/${MEGAPLAY}/stream?${params.toString()}`;
}

export function buildMegaplayStreamDirectPath(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  return buildKittyStreamDirectPath({
    provider: MEGAPLAY,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });
}

function normalizeMegaplayEpisodes(data: unknown): MegaplayEpisode[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { episodes?: unknown })?.episodes)
      ? (data as { episodes: unknown[] }).episodes
      : [];

  const episodes: MegaplayEpisode[] = [];
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

function normalizeMegaplayServers(data: unknown): MegaplayServer[] {
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
    .filter((s): s is MegaplayServer => s != null);
}

export async function fetchMegaplayEpisodes(opts: {
  anilistId: number;
  audio?: "sub" | "dub";
  timeoutMs?: number;
}): Promise<MegaplayEpisode[]> {
  try {
    const res = await kittyApiFetch(buildMegaplayEpisodesPath(opts), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    if (!res.ok) return [];
    return normalizeMegaplayEpisodes(await res.json());
  } catch {
    return [];
  }
}

export async function fetchMegaplayServers(opts: {
  dataIds: string;
  audio: "sub" | "dub";
  timeoutMs?: number;
}): Promise<MegaplayServer[]> {
  try {
    const res = await kittyApiFetch(buildMegaplayServersPath(opts.dataIds, opts.audio), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
    if (!res.ok) return [];
    return normalizeMegaplayServers(await res.json());
  } catch {
    return [];
  }
}

export async function fetchMegaplayStream(opts: {
  linkId: string;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  try {
    const res = await kittyApiFetch(buildMegaplayStreamPath(opts.linkId), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/** One-call playback — episodes → servers → stream inside KittyAPI. */
export async function fetchMegaplayStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> {
  try {
    const res = await kittyApiFetch(buildMegaplayStreamDirectPath(opts), {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
    });
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}
