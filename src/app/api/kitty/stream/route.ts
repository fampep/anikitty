import {
  ensurePlaybackSubtitleCache,
  mergeCachedSubtitleTracks,
} from "@/lib/subtitles/subtitle-cache-store";
import {
  DEFAULT_ALLANIME_MIRROR,
  DEFAULT_MKISSA_MIRROR,
  fetchAllanimeVideoStream,
  isAllanimeMirrorId,
  type AllanimeMirrorId,
} from "@/lib/providers/allanime-api";
import {
  DEFAULT_ANISNATCH_SERVER,
  fetchAnisnatchVideoStream,
  isAnisnatchServerId,
  type AnisnatchServerId,
} from "@/lib/providers/anisnatch-api";
import {
  DEFAULT_ANIMEX_SERVER,
  fetchAnimexVideoStream,
  isAnimexServerId,
  type AnimexServerId,
} from "@/lib/providers/animex-api";
import {
  DEFAULT_ANIMO_SERVER,
  fetchAnimoVideoStream,
  isAnimoServerId,
  type AnimoServerId,
} from "@/lib/providers/animo-api";
import {
  DEFAULT_LUNAR_SERVER,
  fetchLunarVideoStream,
  isLunarServerId,
  type LunarServerId,
} from "@/lib/providers/lunar-api";
import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";
import { fetchKittyProviderStream } from "@/lib/kitty/kitty-stream-api";
import {
  DEFAULT_KITTY_PROVIDER,
  providerHasNativeSubs,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  fetchMiruroVideoStream,
  isMiruroPipeProviderId,
  type MiruroSkipTimes,
} from "@/lib/providers/miruro-api";
import {
  getTrackFile,
  isSubtitleTrack,
  isOurSubtitleUrl,
  stripSubtitleTracks,
  dedupeSubtitleTracks,
  subtitleProxyUrl,
  type StreamTrack,
} from "@/lib/subtitles/subtitle-track-utils";
import { KITTY_SUB_SOURCE_PROVIDER } from "@/lib/kitty/kitty-subs-api";

const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_PIPE = /^[a-z]{2,12}$/;
const SAFE_ANIMEX_SERVER = /^[a-z]{2,12}$/;
const SAFE_ANISNATCH_SERVER = /^[a-z0-9]{2,12}$/;
const SAFE_LUNAR_SERVER = /^[a-z0-9-]{2,12}$/;
const SAFE_ALLANIME_MIRROR = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ANIMO_SERVER = /^hd-[1-3]$/;
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
  return handleKittyApiRequest(req, async () => {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";
  const provider = (searchParams.get("provider") || DEFAULT_KITTY_PROVIDER) as KittyProvider;
  const miruroPipeParam = searchParams.get("miruroPipe");
  const animexServerParam = searchParams.get("animexServer");
  const anisnatchServerParam = searchParams.get("anisnatchServer");
  const lunarServerParam = searchParams.get("lunarServer");
  const allanimeMirrorParam = searchParams.get("allanimeMirror");
  const mkissaMirrorParam = searchParams.get("mkissaMirror");
  const animoServerParam = searchParams.get("animoServer");
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

  const anisnatchServer =
    anisnatchServerParam &&
    SAFE_ANISNATCH_SERVER.test(anisnatchServerParam) &&
    isAnisnatchServerId(anisnatchServerParam)
      ? anisnatchServerParam
      : provider === "AniSnatch"
        ? DEFAULT_ANISNATCH_SERVER
        : null;

  const lunarServer =
    lunarServerParam &&
    SAFE_LUNAR_SERVER.test(lunarServerParam) &&
    isLunarServerId(lunarServerParam)
      ? lunarServerParam
      : provider === "Lunar"
        ? DEFAULT_LUNAR_SERVER
        : null;

  const allanimeMirror =
    allanimeMirrorParam &&
    SAFE_ALLANIME_MIRROR.test(allanimeMirrorParam) &&
    isAllanimeMirrorId(allanimeMirrorParam)
      ? allanimeMirrorParam
      : provider === "AllAnime"
        ? DEFAULT_ALLANIME_MIRROR
        : null;

  const mkissaMirror =
    mkissaMirrorParam &&
    SAFE_ALLANIME_MIRROR.test(mkissaMirrorParam) &&
    isAllanimeMirrorId(mkissaMirrorParam)
      ? mkissaMirrorParam
      : provider === "MKissa"
        ? DEFAULT_MKISSA_MIRROR
        : null;

  const animoServer =
    animoServerParam &&
    SAFE_ANIMO_SERVER.test(animoServerParam) &&
    isAnimoServerId(animoServerParam)
      ? animoServerParam
      : provider === "Animo"
        ? DEFAULT_ANIMO_SERVER
        : null;

  async function finalizeStreamResponse(data: StreamPayload, providerName: KittyProvider) {
    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks as { file?: string; url?: string }[]) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const inlineSubtitleTracks = (data.tracks ?? []).filter(isSubtitleTrack);
    const preserveInlineSubs = providerHasNativeSubs(providerName);
    const providerSubtitleTracks: StreamTrack[] = preserveInlineSubs
      ? inlineSubtitleTracks.map((track) => proxyInlineSubtitle(track, data.headers))
      : [];

    data.tracks = stripSubtitleTracks(data.tracks);
    const fetchedSubs = await ensurePlaybackSubtitleCache(
      {
        ...subtitleCtx,
        animeTitle: titleParam,
        streamProvider: providerName,
      },
      { allowBulk: false },
    );

    data.tracks = await mergeCachedSubtitleTracks(
      data.tracks,
      subtitleCtx,
      data.headers ?? {},
    );

    data.tracks = dedupeSubtitleTracks([
      ...data.tracks,
      ...providerSubtitleTracks,
      ...fetchedSubs.filter(isSubtitleTrack),
    ]);

    if (data.tracks.some(isSubtitleTrack)) {
      data.subtitleSource = providerSubtitleTracks.length
        ? providerName
        : KITTY_SUB_SOURCE_PROVIDER;
    } else {
      data.subtitleSource = KITTY_SUB_SOURCE_PROVIDER;
    }

    return Response.json(data);
  }

  if (provider === "Miruro") {
    try {
      const direct = await fetchKittyProviderStream({
        provider: "Miruro",
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        title: titleParam,
        directOnly: true,
      });

      if (direct?.file) {
        return finalizeStreamResponse(
          {
            file: direct.file,
            headers: direct.headers,
            tracks: direct.tracks,
            download: direct.download,
            server: direct.server,
          },
          "Miruro",
        );
      }

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

  if (provider === "AniSnatch") {
    try {
      const anisnatch = await fetchAnisnatchVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        serverId: anisnatchServer as AnisnatchServerId,
        title: titleParam,
      });

      if (anisnatch?.file) {
        return finalizeStreamResponse(
          {
            file: anisnatch.file,
            headers: anisnatch.headers,
            tracks: anisnatch.tracks,
            skipTimes: anisnatch.skipTimes,
            server: anisnatch.server,
            download: anisnatch.download,
          },
          "AniSnatch",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] AniSnatch server failed:", e);
    }
  }

  if (provider === "Lunar") {
    try {
      const lunar = await fetchLunarVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        serverId: lunarServer as LunarServerId,
        title: titleParam,
      });

      if (lunar?.file) {
        return finalizeStreamResponse(
          {
            file: lunar.file,
            headers: lunar.headers,
            tracks: lunar.tracks,
            skipTimes: lunar.skipTimes,
            server: lunar.server,
            download: lunar.download,
          },
          "Lunar",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] Lunar server failed:", e);
    }
  }

  if (provider === "AllAnime") {
    try {
      const allanime = await fetchAllanimeVideoStream({
        provider: "AllAnime",
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        mirror: allanimeMirror as AllanimeMirrorId,
        title: titleParam,
      });

      if (allanime?.file) {
        return finalizeStreamResponse(
          {
            file: allanime.file,
            headers: allanime.headers,
            tracks: allanime.tracks,
            skipTimes: allanime.skipTimes,
            server: allanime.server,
            download: allanime.download,
          },
          "AllAnime",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] AllAnime mirror failed:", e);
    }
  }

  if (provider === "MKissa") {
    try {
      const mkissa = await fetchAllanimeVideoStream({
        provider: "MKissa",
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        mirror: mkissaMirror as AllanimeMirrorId,
        title: titleParam,
      });

      if (mkissa?.file) {
        return finalizeStreamResponse(
          {
            file: mkissa.file,
            headers: mkissa.headers,
            tracks: mkissa.tracks,
            skipTimes: mkissa.skipTimes,
            server: mkissa.server,
            download: mkissa.download,
          },
          "MKissa",
        );
      }
    } catch (e) {
      console.error("[kitty/stream] MKissa mirror failed:", e);
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

  const streamResult = await fetchKittyProviderStream({
    provider,
    anilistId: subtitleCtx.anilistId,
    episode: subtitleCtx.episode,
    audio: subtitleCtx.audio as "sub" | "dub",
    title: titleParam,
  });

  if (streamResult?.file) {
    const payload = streamResult as StreamPayload;
    const serverLabel = payload.server;
    if (typeof serverLabel === "string") {
      const trimmed = serverLabel.trim();
      payload.server = trimmed || undefined;
    }
    return finalizeStreamResponse(payload, provider);
  }

  return Response.json(
    {
      file: null,
      error: "Provider unavailable",
    },
    { status: 200 },
  );
  });
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
