import {
  ensureMiruroSubtitleCache,
  mergeCachedSubtitleTracks,
} from "@/lib/subtitle-cache-store";
import {
  ANIMESTREAM_SUB_LOCALE,
  DEFAULT_ANIMESTREAM_DUB_LOCALE,
  fetchAnimeStreamVideoStream,
  isAnimeStreamLocale,
  type AnimeStreamLocale,
} from "@/lib/animestream-api";
import {
  DEFAULT_ANIMEX_SERVER,
  fetchAnimexVideoStream,
  isAnimexServerId,
  type AnimexServerId,
} from "@/lib/animex-api";
import {
  DEFAULT_ANIMO_SERVER,
  fetchAnimoVideoStream,
  isAnimoServerId,
  type AnimoServerId,
} from "@/lib/animo-api";
import { buildKittyStreamDirectUrl, kittyApiHeaders } from "@/lib/kitty-api";
import {
  DEFAULT_KITTY_PROVIDER,
  providerHasNativeSubs,
  type KittyProvider,
} from "@/lib/kitty-providers";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  fetchMiruroVideoStream,
  isMiruroPipeProviderId,
  type MiruroSkipTimes,
} from "@/lib/miruro-api";
import {
  getTrackFile,
  isSubtitleTrack,
  isOurSubtitleUrl,
  stripSubtitleTracks,
  dedupeSubtitleTracks,
  SUBTITLE_SOURCE_PROVIDER,
  subtitleProxyUrl,
  type StreamTrack,
} from "@/lib/subtitle-track-utils";

const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_PIPE = /^[a-z]{2,12}$/;
const SAFE_ANIMEX_SERVER = /^[a-z]{2,12}$/;
const SAFE_ANIMO_SERVER = /^hd-[1-3]$/;
const SAFE_ANIMESTREAM_LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/;
const SAFE_ID = /^\d{1,10}$/;
const MAX_TITLE_LEN = 200;

type StreamPayload = {
  file: string;
  headers?: Record<string, string>;
  tracks?: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  miruroPipe?: string;
  server?: string | null;
  download?: string | null;
  subtitleSource?: string;
  error?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";
  const provider = (searchParams.get("provider") || DEFAULT_KITTY_PROVIDER) as KittyProvider;
  const miruroPipeParam = searchParams.get("miruroPipe");
  const animexServerParam = searchParams.get("animexServer");
  const animoServerParam = searchParams.get("animoServer");
  const animestreamLocaleParam = searchParams.get("animestreamLocale");
  const titleParam = searchParams.get("title")?.trim().slice(0, MAX_TITLE_LEN) || undefined;

  if (!anilistId || !episode || !SAFE_ID.test(anilistId) || !SAFE_ID.test(episode)) {
    return Response.json({ error: "anilistId and episode are required" }, { status: 400 });
  }

  if (!["sub", "dub"].includes(audio)) {
    return Response.json({ error: "Invalid audio parameter" }, { status: 400 });
  }

  if (!SAFE_PROVIDER.test(provider)) {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  const subtitleCtx = {
    anilistId: parseInt(anilistId, 10),
    episode: parseInt(episode, 10),
    audio: audio as "sub" | "dub",
  };

  const miruroPipe =
    miruroPipeParam && SAFE_PIPE.test(miruroPipeParam) && isMiruroPipeProviderId(miruroPipeParam)
      ? miruroPipeParam
      : provider === "Miruro"
        ? DEFAULT_MIRURO_PIPE_PROVIDER
        : null;

  const animexServer =
    animexServerParam &&
    SAFE_ANIMEX_SERVER.test(animexServerParam) &&
    isAnimexServerId(animexServerParam)
      ? animexServerParam
      : provider === "Animex"
        ? DEFAULT_ANIMEX_SERVER
        : null;

  const animoServer =
    animoServerParam &&
    SAFE_ANIMO_SERVER.test(animoServerParam) &&
    isAnimoServerId(animoServerParam)
      ? animoServerParam
      : provider === "Animo"
        ? DEFAULT_ANIMO_SERVER
        : null;

  const animestreamLocale: AnimeStreamLocale | null =
    animestreamLocaleParam &&
    SAFE_ANIMESTREAM_LOCALE.test(animestreamLocaleParam) &&
    isAnimeStreamLocale(animestreamLocaleParam)
      ? animestreamLocaleParam
      : provider === "AnimeStream"
        ? subtitleCtx.audio === "sub"
          ? ANIMESTREAM_SUB_LOCALE
          : DEFAULT_ANIMESTREAM_DUB_LOCALE
        : null;

  async function finalizeStreamResponse(data: StreamPayload, providerName: KittyProvider) {
    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks as { file?: string; url?: string }[]) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const inlineSubtitleTracks = (data.tracks ?? []).filter(isSubtitleTrack);
    const preserveInlineSubs =
      providerHasNativeSubs(providerName) ||
      providerName === "Miruro" ||
      providerName === "Animex" ||
      providerName === "Animo" ||
      providerName === "AnimeStream";
    const providerSubtitleTracks: StreamTrack[] = preserveInlineSubs
      ? inlineSubtitleTracks.map((track) => proxyInlineSubtitle(track, data.headers))
      : [];

    data.tracks = stripSubtitleTracks(data.tracks);
    const fetchedSubs = await ensureMiruroSubtitleCache({
      ...subtitleCtx,
      animeTitle: titleParam,
    });

    data.tracks = await mergeCachedSubtitleTracks(
      data.tracks,
      subtitleCtx,
      data.headers ?? {},
    );

    if (providerSubtitleTracks.length > 0) {
      data.tracks = dedupeSubtitleTracks([...data.tracks, ...providerSubtitleTracks]);
      data.subtitleSource = providerName;
    } else if (!data.tracks.some(isSubtitleTrack) && fetchedSubs.length > 0) {
      data.tracks = dedupeSubtitleTracks([...data.tracks, ...fetchedSubs]);
      data.subtitleSource = SUBTITLE_SOURCE_PROVIDER;
    } else {
      data.tracks = dedupeSubtitleTracks(data.tracks);
      data.subtitleSource = SUBTITLE_SOURCE_PROVIDER;
    }

    return Response.json(data);
  }

  if (provider === "Miruro") {
    try {
      const miruro = await fetchMiruroVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        pipeProvider: miruroPipe,
      });

      if (miruro?.file) {
        return finalizeStreamResponse(
          {
            file: miruro.file,
            headers: miruro.headers,
            tracks: miruro.tracks,
            skipTimes: miruro.skipTimes,
            miruroPipe: miruro.provider,
            download: miruro.download,
          },
          "Miruro",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] Miruro pipe failed:", e);
    }
  }

  if (provider === "Animex") {
    try {
      const animex = await fetchAnimexVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        serverId: animexServer as AnimexServerId,
        title: titleParam,
      });

      if (animex?.file) {
        return finalizeStreamResponse(
          {
            file: animex.file,
            headers: animex.headers,
            tracks: animex.tracks,
            skipTimes: animex.skipTimes,
            server: animex.server,
            download: animex.download,
          },
          "Animex",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] Animex server failed:", e);
    }
  }

  if (provider === "Animo") {
    try {
      const animo = await fetchAnimoVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        serverId: animoServer as AnimoServerId,
        title: titleParam,
      });

      if (animo?.file) {
        return finalizeStreamResponse(
          {
            file: animo.file,
            headers: animo.headers,
            tracks: animo.tracks,
            skipTimes: animo.skipTimes,
            server: animo.server,
            download: animo.download,
          },
          "Animo",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] Animo server failed:", e);
    }
  }

  if (provider === "AnimeStream") {
    try {
      const animestream = await fetchAnimeStreamVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        locale: animestreamLocale,
        title: titleParam,
      });

      if (animestream?.file) {
        return finalizeStreamResponse(
          {
            file: animestream.file,
            headers: animestream.headers,
            tracks: animestream.tracks,
            skipTimes: animestream.skipTimes,
            server: animestream.server,
            download: animestream.download,
          },
          "AnimeStream",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] AnimeStream locale failed:", e);
    }
  }

  const url = buildKittyStreamDirectUrl({
    provider,
    anilistId,
    episode,
    audio: audio as "sub" | "dub",
    title: titleParam,
  });

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers: kittyApiHeaders(),
    });

    const data = await res.json();

    if (!res.ok || !data?.file) {
      return Response.json(
        { file: null, error: data?.message ?? data?.error ?? "Provider unavailable" },
        { status: 200 },
      );
    }

    const payload = data as StreamPayload & { server?: string; serverName?: string };
    const serverLabel = payload.server ?? payload.serverName;
    if (typeof serverLabel === "string") {
      const trimmed = serverLabel.trim();
      payload.server = trimmed || undefined;
    }

    return finalizeStreamResponse(payload, provider);
  } catch (e: unknown) {
    const err = e as { name?: string };
    const timedOut = err?.name === "AbortError" || err?.name === "TimeoutError";
    return Response.json(
      { file: null, error: timedOut ? `${provider} timed out` : "Failed to reach provider" },
      { status: 200 },
    );
  }
}

export const maxDuration = 30;

function proxyInlineSubtitle(
  track: StreamTrack,
  headers?: Record<string, string>,
): StreamTrack {
  const file = getTrackFile(track);
  if (!file || isOurSubtitleUrl(file)) return track;
  return { ...track, file: subtitleProxyUrl(file, headers) };
}
