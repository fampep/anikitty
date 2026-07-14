import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";
import {
  buildAnilistSiteEpisodesPath,
  buildAnilistSiteServersPath,
  buildAnilistSiteStreamDirectPath,
  buildAnilistSiteStreamPath,
  fetchAnilistSiteEpisodes,
  fetchAnilistSiteServers,
  fetchAnilistSiteStream,
  fetchAnilistSiteStreamDirect,
  type AnilistSiteEpisode,
  type AnilistSiteServer,
} from "@/lib/kitty/anilist-site-api";
import {
  anilistSiteSeriesUrl,
  MEGAPLAY_PROVIDER_ID,
} from "@/lib/kitty/anilist-site-providers";

export type MegaplaySeriesUrl = `anilist:${number}`;
export type MegaplayEpisode = AnilistSiteEpisode;
export type MegaplayServer = AnilistSiteServer;

const MEGAPLAY = MEGAPLAY_PROVIDER_ID;

/** @deprecated Use {@link anilistSiteSeriesUrl} */
export function megaplayAnilistSeriesUrl(anilistId: number): MegaplaySeriesUrl {
  return anilistSiteSeriesUrl(anilistId);
}

export function buildMegaplayEpisodesPath(opts: {
  anilistId: number;
  audio?: "sub" | "dub";
}): string {
  return buildAnilistSiteEpisodesPath(MEGAPLAY, opts);
}

export function buildMegaplayServersPath(dataIds: string, audio: "sub" | "dub"): string {
  return buildAnilistSiteServersPath(MEGAPLAY, dataIds, audio);
}

export function buildMegaplayStreamPath(linkId: string): string {
  return buildAnilistSiteStreamPath(MEGAPLAY, linkId);
}

export function buildMegaplayStreamDirectPath(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  return buildAnilistSiteStreamDirectPath({ provider: MEGAPLAY, ...opts });
}

export const fetchMegaplayEpisodes = (opts: {
  anilistId: number;
  audio?: "sub" | "dub";
  timeoutMs?: number;
}) => fetchAnilistSiteEpisodes({ provider: MEGAPLAY, ...opts });

export const fetchMegaplayServers = (opts: {
  dataIds: string;
  audio: "sub" | "dub";
  timeoutMs?: number;
}) => fetchAnilistSiteServers({ provider: MEGAPLAY, ...opts });

export const fetchMegaplayStream = (opts: { linkId: string; timeoutMs?: number }) =>
  fetchAnilistSiteStream({ provider: MEGAPLAY, ...opts });

export const fetchMegaplayStreamDirect = (opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> =>
  fetchAnilistSiteStreamDirect({ provider: MEGAPLAY, ...opts });
