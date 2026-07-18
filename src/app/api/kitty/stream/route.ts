import {
  ensurePlaybackSubtitleCache,
  mergeCachedSubtitleTracks,
} from "@/lib/subtitles/subtitle-cache-store";
import {
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
import {
  handleKittyApiRequest,
  getKittyRequestNodeId,
  withKittyApiNodeAsync,
} from "@/lib/kitty/kitty-api-server";
import { isKittyProxiedUrl, resolveKittyStreamUrl } from "@/lib/kitty/kitty-api-core";
import {
  createHlsPlaybackSessionId,
  HLS_SESSION_COOKIE,
  hlsSessionCookieHeader,
  mintKittyHlsProxyUrl,
  readCookie,
  verifyHlsSessionCookieValue,
} from "@/lib/kitty/hls-proxy-token";
import {
  fetchKittyProviderStream,
  raceKittyProviderStream,
} from "@/lib/kitty/kitty-stream-api";
import { fetchWithSubAudioFallback } from "@/lib/kitty/stream-audio-fallback";
import {
  isKittyApiNodeId,
  isKittyNodeRaceParam,
  kittyNodeRaceOrder,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDERS,
  normalizeKittyProvider,
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
import { fetchAnilistSiteStream } from "@/lib/kitty/anilist-site-api";
import {
  isAnilistSiteProvider,
  type AnilistSiteProviderId,
} from "@/lib/kitty/anilist-site-providers";

const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_PIPE = /^[a-z]{2,12}$/;
const SAFE_ANIMEX_SERVER = /^[a-z]{2,12}$/;
const SAFE_ANISNATCH_SERVER = /^[a-z0-9]{2,12}$/;
const SAFE_LUNAR_SERVER = /^[a-z0-9-]{2,12}$/;
const SAFE_ALLANIME_MIRROR = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ANIMO_SERVER = /^hd-[1-3]$/;
const SAFE_ID = /^\d{1,10}$/;
const MAX_TITLE_LEN = 200;

/** Active providers that use generic KittyAPI stream-direct only (not MKissa mirrors or Miruro pipe). */
const STREAM_DIRECT_EXCLUDE = new Set<string>(["MKissa", "Miruro"]);
const STREAM_DIRECT_PROVIDERS = new Set<string>(
  KITTY_PROVIDERS.filter((p) => !STREAM_DIRECT_EXCLUDE.has(p)),
);

type StreamPayload = {
  file: string;
  headers?: Record<string, string>;
  tracks?: StreamTrack[];
  allServers?: KittyStreamQuality[];
  skipTimes?: MiruroSkipTimes;
  miruroPipe?: string;
  server?: string | null;
  download?: string | null;
  /** Storyboard WebVTT URL (ReAnime `thumbnails` / FlixCloud `thumbnails_vtt`). */
  thumbnails?: string | null;
  subtitleSource?: string;
  servedAudio?: "sub" | "dub";
  audioFallback?: boolean;
  error?: string;
  /** Cluster node that won the stream race (or the pinned kittyNode). */
  kittyNode?: KittyApiNodeId;
  /** Wall-clock ms for the CDN race (health + first valid stream-direct). */
  raceMs?: number;
};

function parseExcludeKittyNodes(raw: string | null): KittyApiNodeId[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(isKittyApiNodeId);
}

export async function GET(req: Request) {
  const raceMode = isKittyNodeRaceParam(new URL(req.url).searchParams.get("kittyNode"));
  const run = async () => {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";
  const provider = normalizeKittyProvider(
    searchParams.get("provider") || DEFAULT_KITTY_PROVIDER,
  );
  const preferHardSub = searchParams.get("preferHardSub") === "true";
  const miruroPipeParam = searchParams.get("miruroPipe");
  const animexServerParam = searchParams.get("animexServer");
  const anisnatchServerParam = searchParams.get("anisnatchServer");
  const lunarServerParam = searchParams.get("lunarServer");
  const mkissaMirrorParam = searchParams.get("mkissaMirror");
  const animoServerParam = searchParams.get("animoServer");
  const linkIdParam = searchParams.get("linkId")?.trim() || undefined;
  const titleParam = searchParams.get("title")?.trim().slice(0, MAX_TITLE_LEN) || undefined;
  const raceCandidates = kittyNodeRaceOrder(parseExcludeKittyNodes(searchParams.get("excludeKittyNodes")));

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
    raceMeta?: { raceMs?: number },
  ) {
    const nodeId = getKittyRequestNodeId();
    const streamHeaders = data.headers ?? {};
    const existingSid = verifyHlsSessionCookieValue(readCookie(req, HLS_SESSION_COOKIE));
    const sessionId = existingSid ?? createHlsPlaybackSessionId();
    const mintOpts = { sessionId };

    if (data.file) {
      const resolved = resolveKittyStreamUrl(data.file, nodeId);
      data.file = resolved ? mintKittyHlsProxyUrl(resolved, streamHeaders, mintOpts) : "";
    }

    if (Array.isArray(data.allServers)) {
      data.allServers = data.allServers
        .map((entry) => ({
          quality: entry.quality,
          resolved: resolveKittyStreamUrl(entry.file, nodeId),
        }))
        .filter((entry) => entry.resolved.trim())
        .filter(
          (entry) => providerName !== "AniDB" || isKittyProxiedUrl(entry.resolved),
        )
        .map((entry) => ({
          quality: entry.quality,
          file: mintKittyHlsProxyUrl(entry.resolved, streamHeaders, mintOpts),
        }));
    }

    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks as { file?: string; url?: string }[]) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    // Storyboard VTT — top-level field (ReAnime) or a thumbnails track.
    {
      const fromField =
        typeof data.thumbnails === "string" ? data.thumbnails.trim() : "";
      let storyboard = fromField;
      if (!storyboard && Array.isArray(data.tracks)) {
        for (const t of data.tracks) {
          const kind = (t.kind ?? "").toLowerCase();
          const label = (t.label ?? "").toLowerCase();
          if (
            kind === "thumbnails" ||
            kind === "thumbnail" ||
            label.includes("thumbnail") ||
            label.includes("storyboard")
          ) {
            const file = getTrackFile(t);
            if (file) {
              storyboard = file;
              break;
            }
          }
        }
      }
      if (storyboard && !isOurSubtitleUrl(storyboard)) {
        data.thumbnails = subtitleProxyUrl(storyboard, data.headers);
      } else if (storyboard) {
        data.thumbnails = storyboard;
      } else {
        data.thumbnails = null;
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
    data.kittyNode = nodeId ?? getKittyRequestNodeId();
    if (typeof raceMeta?.raceMs === "number" && Number.isFinite(raceMeta.raceMs)) {
      data.raceMs = Math.max(0, Math.round(raceMeta.raceMs));
    }

    return Response.json(data, {
      headers: {
        "Set-Cookie": hlsSessionCookieHeader(sessionId),
        "Cache-Control": "private, no-store",
      },
    });
  }

  async function respondWithStream(
    payload: StreamPayload | null,
    providerName: KittyProvider,
    servedAudio: "sub" | "dub",
    audioFallback: boolean,
    wonNode?: KittyApiNodeId,
    raceMs?: number,
  ) {
    if (!payload?.file) return null;
    const nodeId = wonNode ?? getKittyRequestNodeId();
    const raceMeta = raceMs != null ? { raceMs } : undefined;
    if (nodeId && nodeId !== getKittyRequestNodeId()) {
      return withKittyApiNodeAsync(nodeId, () =>
        finalizeStreamResponse(payload, providerName, servedAudio, audioFallback, raceMeta),
      );
    }
    return finalizeStreamResponse(payload, providerName, servedAudio, audioFallback, raceMeta);
  }

  async function fetchStreamDirectPlayback(providerName: KittyProvider): Promise<{
    result: StreamPayload | null;
    servedAudio: "sub" | "dub";
    audioFallback: boolean;
    nodeId?: KittyApiNodeId;
    raceMs?: number;
  }> {
    let wonNode: KittyApiNodeId | undefined;
    let raceMs: number | undefined;
    const attempt = await fetchWithSubAudioFallback(subtitleCtx.audio, async (streamAudio) => {
      if (raceMode) {
        const raced = await raceKittyProviderStream(
          {
            provider: providerName,
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
            directOnly: true,
            preferHardSub,
          },
          raceCandidates,
        );
        if (!raced?.stream?.file) return null;
        wonNode = raced.nodeId;
        raceMs = raced.raceMs;
        const payload = raced.stream as StreamPayload;
        const serverLabel = payload.server;
        if (typeof serverLabel === "string") {
          const trimmed = serverLabel.trim();
          payload.server = trimmed || undefined;
        }
        return payload;
      }

      const streamResult = await fetchKittyProviderStream({
        provider: providerName,
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: streamAudio,
        title: titleParam,
        directOnly: true,
        preferHardSub,
      });

      if (!streamResult?.file) return null;

      const payload = streamResult as StreamPayload;
      const serverLabel = payload.server;
      if (typeof serverLabel === "string") {
        const trimmed = serverLabel.trim();
        payload.server = trimmed || undefined;
      }
      return payload;
    });
    return { ...attempt, nodeId: wonNode, raceMs };
  }

  if (STREAM_DIRECT_PROVIDERS.has(provider)) {
    if (linkIdParam && isAnilistSiteProvider(provider)) {
      const linked = await fetchAnilistSiteStream({
        provider: provider as AnilistSiteProviderId,
        linkId: linkIdParam,
      });
      const linkedResponse = await respondWithStream(linked, provider, audio as "sub" | "dub", false);
      if (linkedResponse) return linkedResponse;
    }

    const directAttempt = await fetchStreamDirectPlayback(provider);
    const directResponse = await respondWithStream(
      directAttempt.result,
      provider,
      directAttempt.servedAudio,
      directAttempt.audioFallback,
      directAttempt.nodeId,
      directAttempt.raceMs,
    );
    if (directResponse) return directResponse;

    return Response.json(
      {
        file: null,
        error: "Provider unavailable",
      },
      { status: 200 },
    );
  }

  if (provider === "Miruro") {
    try {
      let miruroWonNode: KittyApiNodeId | undefined;
      let miruroRaceMs: number | undefined;
      const miruroAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          if (raceMode) {
            const raced = await raceKittyProviderStream(
              {
                provider: "Miruro",
                anilistId: subtitleCtx.anilistId,
                episode: subtitleCtx.episode,
                audio: streamAudio,
                title: titleParam,
                directOnly: true,
              },
              raceCandidates,
            );
            if (raced?.stream?.file) {
              miruroWonNode = raced.nodeId;
              miruroRaceMs = raced.raceMs;
              return {
                file: raced.stream.file,
                headers: raced.stream.headers,
                tracks: raced.stream.tracks,
                allServers: raced.stream.allServers,
                download: raced.stream.download,
                server: raced.stream.server,
              };
            }
          } else {
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
        miruroWonNode,
        miruroRaceMs,
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

  const genericAttempt = await fetchStreamDirectPlayback(provider);

  const genericResponse = await respondWithStream(
    genericAttempt.result,
    provider,
    genericAttempt.servedAudio,
    genericAttempt.audioFallback,
    genericAttempt.nodeId,
    genericAttempt.raceMs,
  );
  if (genericResponse) return genericResponse;

  return Response.json(
    {
      file: null,
      error: "Provider unavailable",
    },
    { status: 200 },
  );
  };

  if (raceMode) {
    // Race picks the winning node; don't pin ALS to a geo/ping "preferred" peer first.
    return withKittyApiNodeAsync(undefined, run);
  }
  return handleKittyApiRequest(req, run);
}

export const maxDuration = 60;

function proxyInlineSubtitle(
  track: StreamTrack,
  headers?: Record<string, string>,
): StreamTrack {
  const file = getTrackFile(track);
  if (!file || isOurSubtitleUrl(file)) return track;
  return { ...track, file: subtitleProxyUrl(file, headers) };
}
