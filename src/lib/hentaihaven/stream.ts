import "server-only";

import { getHhSeriesById, getHhSeriesBySlug } from "@/lib/hentaihaven/catalog";
import { hhKittyGet } from "@/lib/hentaihaven/client";
import type { HhStreamResult } from "@/lib/hentaihaven/config";
import {
  createHlsPlaybackSessionId,
  hlsSessionCookieHeader,
  HLS_SESSION_COOKIE,
  mintKittyHlsProxyUrl,
  readCookie,
  verifyHlsSessionCookieValue,
} from "@/lib/kitty/hls-proxy-token";
import { isAllowedMediaProxyUrl } from "@/lib/security/security";

export type HhResolvedStream = HhStreamResult & {
  sessionCookie?: string;
};

type KittyStreamPayload = {
  file?: string;
  headers?: Record<string, string>;
  error?: string;
};

/**
 * Resolve playback via KittyAPI `/provider/HentaiHaven/stream` (API scrapes HH).
 */
export async function resolveHhEpisodeStream(
  req: Request,
  opts: {
    seriesSlug?: string;
    seriesId?: number;
    episodeSlug?: string;
    episodeNumber?: number;
  },
): Promise<HhResolvedStream> {
  const series =
    opts.seriesId != null
      ? await getHhSeriesById(opts.seriesId)
      : opts.seriesSlug
        ? await getHhSeriesBySlug(opts.seriesSlug)
        : null;

  if (!series) throw new Error("Series not found");

  const episode =
    series.episodes.find((ep) =>
      opts.episodeSlug
        ? ep.slug === opts.episodeSlug
        : opts.episodeNumber != null
          ? ep.number === opts.episodeNumber
          : false,
    ) ??
    (opts.episodeNumber == null && !opts.episodeSlug
      ? series.episodes[0]
      : undefined);

  if (!episode?.dataIds) throw new Error("Episode not found");

  const stream = await hhKittyGet<KittyStreamPayload>("stream", {
    linkId: episode.dataIds,
  });
  const streamUrl = (stream.file ?? "").trim();
  if (!streamUrl) throw new Error(stream.error || "No stream available");
  if (!isAllowedMediaProxyUrl(streamUrl)) throw new Error("Stream URL blocked");

  const existingSid = verifyHlsSessionCookieValue(
    readCookie(req, HLS_SESSION_COOKIE),
  );
  const sessionId = existingSid ?? createHlsPlaybackSessionId();
  const headers = stream.headers ?? {};
  const file = mintKittyHlsProxyUrl(streamUrl, headers, { sessionId });
  if (!file) throw new Error("Could not mint playback URL");

  return {
    file,
    headers,
    title: episode.title,
    seriesTitle: series.title,
    seriesSlug: series.slug,
    episodeNumber: episode.number,
    episodeSlug: episode.slug,
    poster: episode.poster || series.poster || null,
    sessionCookie: existingSid ? undefined : hlsSessionCookieHeader(sessionId),
  };
}
