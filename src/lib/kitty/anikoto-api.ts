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
  ANIKOTO_PROVIDER_ID,
} from "@/lib/kitty/anilist-site-providers";

export type AnikotoSeriesUrl = `anilist:${number}` | string;

export type AnikotoEpisode = AnilistSiteEpisode;
export type AnikotoServer = AnilistSiteServer;

const ANIKOTO = ANIKOTO_PROVIDER_ID;

export function anikotoAnilistSeriesUrl(anilistId: number): `anilist:${number}` {
  return anilistSiteSeriesUrl(anilistId);
}

export function buildAnikotoEpisodesPath(opts: {
  anilistId: number;
  audio?: "sub" | "dub";
}): string {
  return buildAnilistSiteEpisodesPath(ANIKOTO, opts);
}

export function buildAnikotoServersPath(dataIds: string, audio: "sub" | "dub"): string {
  return buildAnilistSiteServersPath(ANIKOTO, dataIds, audio);
}

export function buildAnikotoStreamPath(linkId: string): string {
  return buildAnilistSiteStreamPath(ANIKOTO, linkId);
}

export function buildAnikotoStreamDirectPath(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  return buildAnilistSiteStreamDirectPath({ provider: ANIKOTO, ...opts });
}

export const fetchAnikotoEpisodes = (opts: {
  anilistId: number;
  audio?: "sub" | "dub";
  timeoutMs?: number;
}) => fetchAnilistSiteEpisodes({ provider: ANIKOTO, ...opts });

export const fetchAnikotoServers = (opts: {
  dataIds: string;
  audio: "sub" | "dub";
  timeoutMs?: number;
}) => fetchAnilistSiteServers({ provider: ANIKOTO, ...opts });

export const fetchAnikotoStream = (opts: { linkId: string; timeoutMs?: number }) =>
  fetchAnilistSiteStream({ provider: ANIKOTO, ...opts });

export const fetchAnikotoStreamDirect = (opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
}): Promise<KittyStreamPayload | null> =>
  fetchAnilistSiteStreamDirect({ provider: ANIKOTO, ...opts });
