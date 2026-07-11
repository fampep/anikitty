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
import { handleKittyApiRequest, getKittyRequestNodeId } from "@/lib/kitty/kitty-api-server";
import { resolveKittyStreamUrl } from "@/lib/kitty/kitty-api-core";
import { fetchKittyProviderStream } from "@/lib/kitty/kitty-stream-api";
import { fetchWithSubAudioFallback } from "@/lib/kitty/stream-audio-fallback";
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
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
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
  allServers?: KittyStreamQuality[];
  skipTimes?: MiruroSkipTimes;
  miruroPipe?: string;
  server?: string | null;
  download?: string | null;
  subtitleSource?: string;
  servedAudio?: "sub" | "dub";
  audioFallback?: boolean;
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

  async function finalizeStreamResponse(
    data: StreamPayload,
    providerName: KittyProvider,
    servedAudio: "sub" | "dub" = subtitleCtx.audio,
    audioFallback = servedAudio !== subtitleCtx.audio,
  ) {
    const nodeId = getKittyRequestNodeId();
    if (data.file) {
      data.file = resolveKittyStreamUrl(data.file, nodeId);
    }

    if (Array.isArray(data.allServers)) {
      data.allServers = data.allServers
        .map((entry) => ({
          quality: entry.quality,
          file: resolveKittyStreamUrl(entry.file, nodeId),
        }))
        .filter((entry) => entry.file.trim());
    }

    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks as { file?: string; url?: string }[]) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const playbackCtx = { ...subtitleCtx, audio: servedAudio };

    const inlineSubtitleTracks = (data.tracks ?? []).filter(isSubtitleTrack);
    const preserveInlineSubs = providerHasNativeSubs(providerName);
    const providerSubtitleTracks: StreamTrack[] = preserveInlineSubs
      ? inlineSubtitleTracks.map((track) => proxyInlineSubtitle(track, data.headers))
      : [];

    data.tracks = stripSubtitleTracks(data.tracks);
    const fetchedSubs = await ensurePlaybackSubtitleCache(
      {
        ...playbackCtx,
        animeTitle: titleParam,
        streamProvider: providerName,
      },
    );

    data.tracks = await mergeCachedSubtitleTracks(
      data.tracks,
      playbackCtx,
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

    data.servedAudio = servedAudio;
    data.audioFallback = audioFallback;

    return Response.json(data);
  }

  async function respondWithStream(
    payload: StreamPayload | null,
    providerName: KittyProvider,
    servedAudio: "sub" | "dub",
    audioFallback: boolean,
  ) {
    if (!payload?.file) return null;
    return finalizeStreamResponse(payload, providerName, servedAudio, audioFallback);
  }

  if (provider === "Miruro") {
    try {
      const miruroAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const direct = await fetchKittyProviderStream({
            provider: "Miruro",
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
            directOnly: true,
          });

          if (direct?.file) {
            return {
              file: direct.file,
              headers: direct.headers,
              tracks: direct.tracks,
              allServers: direct.allServers,
              download: direct.download,
              server: direct.server,
            };
          }

          const miruro = await fetchMiruroVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            pipeProvider: miruroPipe,
          });

          if (!miruro?.file) return null;

          return {
            file: miruro.file,
            headers: miruro.headers,
            tracks: miruro.tracks,
            skipTimes: miruro.skipTimes,
            miruroPipe: miruro.provider,
            download: miruro.download,
          };
        },
      );

      const miruroResponse = await respondWithStream(
        miruroAttempt.result,
        "Miruro",
        miruroAttempt.servedAudio,
        miruroAttempt.audioFallback,
      );
      if (miruroResponse) return miruroResponse;
    } catch (e) {
      console.error("[kitty/stream] Miruro pipe failed:", e);
    }
  }

  if (provider === "Animex") {
    try {
      const animexAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const animex = await fetchAnimexVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: animexServer as AnimexServerId,
            title: titleParam,
          });

          if (!animex?.file) return null;

          return {
            file: animex.file,
            headers: animex.headers,
            tracks: animex.tracks,
            skipTimes: animex.skipTimes,
            server: animex.server,
            download: animex.download,
          };
        },
      );

      const animexResponse = await respondWithStream(
        animexAttempt.result,
        "Animex",
        animexAttempt.servedAudio,
        animexAttempt.audioFallback,
      );
      if (animexResponse) return animexResponse;
    } catch (e) {
      console.error("[kitty/stream] Animex server failed:", e);
    }
  }

  if (provider === "AniSnatch") {
    try {
      const anisnatchAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const anisnatch = await fetchAnisnatchVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: anisnatchServer as AnisnatchServerId,
            title: titleParam,
          });

          if (!anisnatch?.file) return null;

          return {
            file: anisnatch.file,
            headers: anisnatch.headers,
            tracks: anisnatch.tracks,
            skipTimes: anisnatch.skipTimes,
            server: anisnatch.server,
            download: anisnatch.download,
          };
        },
      );

      const anisnatchResponse = await respondWithStream(
        anisnatchAttempt.result,
        "AniSnatch",
        anisnatchAttempt.servedAudio,
        anisnatchAttempt.audioFallback,
      );
      if (anisnatchResponse) return anisnatchResponse;
    } catch (e) {
      console.error("[kitty/stream] AniSnatch server failed:", e);
    }
  }

  if (provider === "Lunar") {
    try {
      const lunarAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const lunar = await fetchLunarVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: lunarServer as LunarServerId,
            title: titleParam,
          });

          if (!lunar?.file) return null;

          return {
            file: lunar.file,
            headers: lunar.headers,
            tracks: lunar.tracks,
            skipTimes: lunar.skipTimes,
            server: lunar.server,
            download: lunar.download,
          };
        },
      );

      const lunarResponse = await respondWithStream(
        lunarAttempt.result,
        "Lunar",
        lunarAttempt.servedAudio,
        lunarAttempt.audioFallback,
      );
      if (lunarResponse) return lunarResponse;
    } catch (e) {
      console.error("[kitty/stream] Lunar server failed:", e);
    }
  }

  if (provider === "AllAnime") {
    try {
      const allanimeAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const allanime = await fetchAllanimeVideoStream({
            provider: "AllAnime",
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            mirror: allanimeMirror as AllanimeMirrorId,
            title: titleParam,
          });

          if (!allanime?.file) return null;

          return {
            file: allanime.file,
            headers: allanime.headers,
            tracks: allanime.tracks,
            allServers: allanime.allServers,
            skipTimes: allanime.skipTimes,
            server: allanime.server,
            download: allanime.download,
          };
        },
      );

      const allanimeResponse = await respondWithStream(
        allanimeAttempt.result,
        "AllAnime",
        allanimeAttempt.servedAudio,
        allanimeAttempt.audioFallback,
      );
      if (allanimeResponse) return allanimeResponse;
    } catch (e) {
      console.error("[kitty/stream] AllAnime mirror failed:", e);
    }
  }

  if (provider === "MKissa") {
    try {
      const mkissaAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const mkissa = await fetchAllanimeVideoStream({
            provider: "MKissa",
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            mirror: mkissaMirror as AllanimeMirrorId,
            title: titleParam,
          });

          if (!mkissa?.file) return null;

          return {
            file: mkissa.file,
            headers: mkissa.headers,
            tracks: mkissa.tracks,
            allServers: mkissa.allServers,
            skipTimes: mkissa.skipTimes,
            server: mkissa.server,
            download: mkissa.download,
          };
        },
      );

      const mkissaResponse = await respondWithStream(
        mkissaAttempt.result,
        "MKissa",
        mkissaAttempt.servedAudio,
        mkissaAttempt.audioFallback,
      );
      if (mkissaResponse) return mkissaResponse;
    } catch (e) {
      console.error("[kitty/stream] MKissa mirror failed:", e);
    }
  }

  if (provider === "Animo") {
    try {
      const animoAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const animo = await fetchAnimoVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: animoServer as AnimoServerId,
            title: titleParam,
          });

          if (!animo?.file) return null;

          return {
            file: animo.file,
            headers: animo.headers,
            tracks: animo.tracks,
            skipTimes: animo.skipTimes,
            server: animo.server,
            download: animo.download,
          };
        },
      );

      const animoResponse = await respondWithStream(
        animoAttempt.result,
        "Animo",
        animoAttempt.servedAudio,
        animoAttempt.audioFallback,
      );
      if (animoResponse) return animoResponse;
    } catch (e) {
      console.error("[kitty/stream] Animo server failed:", e);
    }
  }

  const genericAttempt = await fetchWithSubAudioFallback(
    subtitleCtx.audio,
    async (streamAudio) => {
      const streamResult = await fetchKittyProviderStream({
        provider,
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: streamAudio,
        title: titleParam,
      });

      if (!streamResult?.file) return null;

      const payload = streamResult as StreamPayload;
      const serverLabel = payload.server;
      if (typeof serverLabel === "string") {
        const trimmed = serverLabel.trim();
        payload.server = trimmed || undefined;
      }
      return payload;
    },
  );

  const genericResponse = await respondWithStream(
    genericAttempt.result,
    provider,
    genericAttempt.servedAudio,
    genericAttempt.audioFallback,
  );
  if (genericResponse) return genericResponse;

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
