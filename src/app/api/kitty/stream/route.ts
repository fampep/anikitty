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
  DEFAULT_ANIKURO_SERVER,
  fetchAnikuroVideoStream,
  isAnikuroServerId,
  type AnikuroServerId,
} from "@/lib/providers/anikuro-api";
import {
  DEFAULT_ANIWAVES_SERVER,
  fetchAniwavesVideoStream,
  isAniwavesServerId,
  type AniwavesServerId,
} from "@/lib/providers/aniwaves-api";
import {
  DEFAULT_ANINEKO_SERVER,
  DEFAULT_ANINEKO_SOFT_SERVER,
  fetchAninekoVideoStream,
  isAninekoServerId,
  type AninekoServerId,
} from "@/lib/providers/anineko-api";
import { fetchAnikotoVideoStream } from "@/lib/providers/anikoto-api";
import { fetchAniwatchVideoStream } from "@/lib/providers/aniwatch-api";
import { fetchSenshiVideoStream } from "@/lib/providers/senshi-api";
import { fetchKickAssAnimeVideoStream } from "@/lib/providers/kickassanime-api";
import { fetchKuroHostVideoStream } from "@/lib/providers/kurohost-api";
import {
  DEFAULT_ANISNATCH_SERVER,
  fetchAnisnatchVideoStream,
  isAnisnatchServerId,
  type AnisnatchServerId,
} from "@/lib/providers/anisnatch-api";
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
import type { MiruroSkipTimes } from "@/lib/providers/miruro-types";
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
import { isLikelyMediaStreamUrl } from "@/lib/kitty/stream-url-guard";

const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ANISNATCH_SERVER = /^[a-z0-9]{2,12}$/;
const SAFE_ALLANIME_MIRROR = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ANIKURO_SERVER = /^[a-z0-9-]{2,16}$/;
const SAFE_ANIWAVES_SERVER = /^[0-9]{1,3}$/;
const SAFE_ANINEKO_SERVER = /^hd-[1-3]$/;
const SAFE_ID = /^\d{1,10}$/;
const MAX_TITLE_LEN = 200;

/**
 * Providers with their own race / mirror wiring — skip the shared auto race.
 * Everyone else races `stream-direct` across static-IP nodes when kittyNode=auto.
 */
const STREAM_RACE_SKIP = new Set<string>();

/**
 * After an auto race misses, still try dedicated linkId/servers/mirrors.
 * Plain stream-direct providers already exhausted every healthy CDN node.
 */
const STREAM_DEDICATED_AFTER_RACE = new Set<string>([
  "MKissa",
  "Anikoto",
  "AniSnatch",
  "AniKuro",
  "AniWaves",
]);

type StreamPayload = {
  file: string;
  headers?: Record<string, string>;
  tracks?: StreamTrack[];
  allServers?: KittyStreamQuality[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
  /** Storyboard WebVTT URL (ReAnime `thumbnails` / FlixCloud `thumbnails_vtt`). */
  thumbnails?: string | null;
  subtitleSource?: string;
  servedAudio?: "sub" | "dub";
  audioFallback?: boolean;
  /** KittyAPI returned a persistent stored stream URL. */
  cached?: boolean;
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
  const anisnatchServerParam = searchParams.get("anisnatchServer");
  const mkissaMirrorParam = searchParams.get("mkissaMirror");
  const anikuroServerParam = searchParams.get("anikuroServer");
  const aniwavesServerParam = searchParams.get("aniwavesServer");
  const aninekoServerParam = searchParams.get("aninekoServer");
  const linkIdParam = searchParams.get("linkId")?.trim() || undefined;
  const titleParam = searchParams.get("title")?.trim().slice(0, MAX_TITLE_LEN) || undefined;
  const refreshStream =
    searchParams.get("refresh") === "1" || searchParams.get("refresh") === "true";
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

  const anisnatchServer =
    anisnatchServerParam &&
    SAFE_ANISNATCH_SERVER.test(anisnatchServerParam) &&
    isAnisnatchServerId(anisnatchServerParam)
      ? anisnatchServerParam
      : provider === "AniSnatch"
        ? DEFAULT_ANISNATCH_SERVER
        : null;

  const mkissaMirror =
    mkissaMirrorParam &&
    SAFE_ALLANIME_MIRROR.test(mkissaMirrorParam) &&
    isAllanimeMirrorId(mkissaMirrorParam)
      ? mkissaMirrorParam
      : provider === "MKissa"
        ? DEFAULT_MKISSA_MIRROR
        : null;

  const anikuroServer =
    anikuroServerParam &&
    SAFE_ANIKURO_SERVER.test(anikuroServerParam) &&
    isAnikuroServerId(anikuroServerParam)
      ? anikuroServerParam
      : provider === "AniKuro"
        ? DEFAULT_ANIKURO_SERVER
        : null;

  const aniwavesServer =
    aniwavesServerParam &&
    SAFE_ANIWAVES_SERVER.test(aniwavesServerParam) &&
    isAniwavesServerId(aniwavesServerParam)
      ? aniwavesServerParam
      : provider === "AniWaves"
        ? DEFAULT_ANIWAVES_SERVER
        : null;

  const aninekoServer =
    aninekoServerParam &&
    SAFE_ANINEKO_SERVER.test(aninekoServerParam) &&
    isAninekoServerId(aninekoServerParam)
      ? aninekoServerParam
      : provider === "AniNeko"
        ? preferHardSub
          ? DEFAULT_ANINEKO_SERVER
          : DEFAULT_ANINEKO_SOFT_SERVER
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
      ? inlineSubtitleTracks.map((track) => {
          const headers =
            providerName === "AniWatch"
              ? {
                  ...(data.headers ?? {}),
                  Referer: data.headers?.Referer || data.headers?.referer || "https://anizone.to/",
                }
              : data.headers;
          return proxyInlineSubtitle(track, headers);
        })
      : [];

    data.tracks = stripSubtitleTracks(data.tracks);
    const cachedMerged = await mergeCachedSubtitleTracks(
      data.tracks,
      playbackCtx,
      data.headers ?? {},
    );

    // Don't block first paint on Kitty /subs when the provider already shipped soft subs.
    // Warm the cache in the background so later episodes / language picks stay fast.
    // Juliet (AniWatch/AniZone) always races /subs too — dual-audio soft ASS is the /subs path.
    let fetchedSubs: StreamTrack[] = [];
    const subWarm = {
      ...playbackCtx,
      animeTitle: titleParam,
      streamProvider: providerName,
    };
    const awaitSubsForProvider = providerName === "AniWatch";
    if (preserveInlineSubs && providerSubtitleTracks.length > 0 && !awaitSubsForProvider) {
      void ensurePlaybackSubtitleCache(subWarm);
    } else {
      fetchedSubs = await Promise.race([
        ensurePlaybackSubtitleCache(subWarm),
        new Promise<StreamTrack[]>((resolve) => {
          // Alpha often needs a bit longer for Kitty /subs when embed tracks are empty.
          const waitMs =
            providerName === "AniKuro" || providerName === "AniWatch" ? 4_000 : 2_000;
          setTimeout(() => resolve([]), waitMs);
        }),
      ]);
      if (fetchedSubs.length === 0) {
        void ensurePlaybackSubtitleCache(subWarm);
      }
    }

    data.tracks = dedupeSubtitleTracks([
      ...cachedMerged,
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
        // Proxied URLs are session-bound; browser must not reuse the JSON body.
        // React Query keeps the resolved stream client-side for 24h.
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
    if (!isLikelyMediaStreamUrl(payload.file)) {
      console.warn(
        `[kitty/stream] Rejected non-media stream from ${providerName}:`,
        String(payload.file).slice(0, 120),
      );
      return null;
    }
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
            refresh: refreshStream,
          },
          raceCandidates,
        );
        if (!raced?.stream?.file) return null;
        wonNode = raced.nodeId;
        raceMs = raced.raceMs;
        const payload = raced.stream as StreamPayload;
        if (raced.stream.cached) payload.cached = true;
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
        refresh: refreshStream,
      });

      if (!streamResult?.file) return null;

      const payload = streamResult as StreamPayload;
      if (streamResult.cached) payload.cached = true;
      const serverLabel = payload.server;
      if (typeof serverLabel === "string") {
        const trimmed = serverLabel.trim();
        payload.server = trimmed || undefined;
      }
      return payload;
    });
    return { ...attempt, nodeId: wonNode, raceMs };
  }

  // kittyNode=auto: race stream-direct across healthy static-IP nodes first.
  // Dedicated handlers below are fallbacks (linkId / servers / mirrors).
  // For Alpha (AniKuro), a track-less race hit is deferred so soft-sub linkId
  // resolution can run; race result is kept as last-resort video.
  let deferredRaceAttempt: Awaited<
    ReturnType<typeof fetchStreamDirectPlayback>
  > | null = null;

  if (raceMode && !STREAM_RACE_SKIP.has(provider)) {
    const racedAttempt = await fetchStreamDirectPlayback(provider);
    const racedNativeSubs = (racedAttempt.result?.tracks ?? []).filter(isSubtitleTrack);
    const deferForSoftSubs =
      provider === "AniKuro" &&
      Boolean(racedAttempt.result?.file) &&
      racedNativeSubs.length === 0 &&
      STREAM_DEDICATED_AFTER_RACE.has(provider);

    if (deferForSoftSubs) {
      deferredRaceAttempt = racedAttempt;
    } else {
      const racedResponse = await respondWithStream(
        racedAttempt.result,
        provider,
        racedAttempt.servedAudio,
        racedAttempt.audioFallback,
        racedAttempt.nodeId,
        racedAttempt.raceMs,
      );
      if (racedResponse) return racedResponse;

      if (!STREAM_DEDICATED_AFTER_RACE.has(provider)) {
        return Response.json(
          {
            file: null,
            error: "Provider unavailable",
          },
          { status: 200 },
        );
      }
    }
  }

  if (provider === "AniWaves") {
    try {
      const aniwavesAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const aniwaves = await fetchAniwavesVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: aniwavesServer as AniwavesServerId,
            title: titleParam,
          });

          if (!aniwaves?.file) return null;

          return {
            file: aniwaves.file,
            headers: aniwaves.headers,
            tracks: aniwaves.tracks,
            allServers: aniwaves.allServers,
            skipTimes: aniwaves.skipTimes,
            server: aniwaves.server,
            download: aniwaves.download,
          };
        },
      );

      const aniwavesResponse = await respondWithStream(
        aniwavesAttempt.result,
        "AniWaves",
        aniwavesAttempt.servedAudio,
        aniwavesAttempt.audioFallback,
      );
      if (aniwavesResponse) return aniwavesResponse;
    } catch (e) {
      console.error("[kitty/stream] AniWaves server failed:", e);
    }
  }

  if (provider === "AniNeko") {
    try {
      const aninekoAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const anineko = await fetchAninekoVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: aninekoServer as AninekoServerId,
            title: titleParam,
          });

          if (!anineko?.file) return null;

          return {
            file: anineko.file,
            headers: anineko.headers,
            tracks: anineko.tracks,
            allServers: anineko.allServers,
            skipTimes: anineko.skipTimes,
            server: anineko.server,
            download: anineko.download,
          };
        },
      );

      const aninekoResponse = await respondWithStream(
        aninekoAttempt.result,
        "AniNeko",
        aninekoAttempt.servedAudio,
        aninekoAttempt.audioFallback,
      );
      if (aninekoResponse) return aninekoResponse;
    } catch (e) {
      console.error("[kitty/stream] AniNeko server failed:", e);
    }
  }

  if (provider === "Anikoto") {
    try {
      const anikotoAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const anikoto = await fetchAnikotoVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
            preferHardSub,
            linkId: linkIdParam,
            refresh: refreshStream,
          });

          if (!anikoto?.file) return null;

          return {
            file: anikoto.file,
            headers: anikoto.headers,
            tracks: anikoto.tracks,
            allServers: anikoto.allServers,
            server: anikoto.server,
            download: anikoto.download,
          };
        },
      );

      const anikotoResponse = await respondWithStream(
        anikotoAttempt.result,
        "Anikoto",
        anikotoAttempt.servedAudio,
        anikotoAttempt.audioFallback,
      );
      if (anikotoResponse) return anikotoResponse;
    } catch (e) {
      console.error("[kitty/stream] Anikoto stream failed:", e);
    }
  }

  if (provider === "AniWatch") {
    try {
      const aniwatchAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const aniwatch = await fetchAniwatchVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
          });

          if (!aniwatch?.file) return null;

          return {
            file: aniwatch.file,
            headers: aniwatch.headers,
            tracks: aniwatch.tracks,
            allServers: aniwatch.allServers,
            server: aniwatch.server,
            download: aniwatch.download,
          };
        },
      );

      const aniwatchResponse = await respondWithStream(
        aniwatchAttempt.result,
        "AniWatch",
        aniwatchAttempt.servedAudio,
        aniwatchAttempt.audioFallback,
      );
      if (aniwatchResponse) return aniwatchResponse;
    } catch (e) {
      console.error("[kitty/stream] AniWatch stream failed:", e);
    }
  }

  if (provider === "Senshi") {
    try {
      const senshiAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const senshi = await fetchSenshiVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
          });

          if (!senshi?.file) return null;

          return {
            file: senshi.file,
            headers: senshi.headers,
            tracks: senshi.tracks,
            allServers: senshi.allServers,
            server: senshi.server,
            download: senshi.download,
          };
        },
      );

      const senshiResponse = await respondWithStream(
        senshiAttempt.result,
        "Senshi",
        senshiAttempt.servedAudio,
        senshiAttempt.audioFallback,
      );
      if (senshiResponse) return senshiResponse;
    } catch (e) {
      console.error("[kitty/stream] Senshi stream failed:", e);
    }
  }

  if (provider === "KickAssAnime") {
    try {
      const kaaAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const kaa = await fetchKickAssAnimeVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
          });

          if (!kaa?.file) return null;

          return {
            file: kaa.file,
            headers: kaa.headers,
            tracks: kaa.tracks,
            allServers: kaa.allServers,
            server: kaa.server,
            download: kaa.download,
          };
        },
      );

      const kaaResponse = await respondWithStream(
        kaaAttempt.result,
        "KickAssAnime",
        kaaAttempt.servedAudio,
        kaaAttempt.audioFallback,
      );
      if (kaaResponse) return kaaResponse;
    } catch (e) {
      console.error("[kitty/stream] KickAssAnime stream failed:", e);
    }
  }

  if (provider === "KuroHost") {
    try {
      const kuroAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const kuro = await fetchKuroHostVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            title: titleParam,
          });

          if (!kuro?.file) return null;

          return {
            file: kuro.file,
            headers: kuro.headers,
            tracks: kuro.tracks,
            allServers: kuro.allServers,
            server: kuro.server,
            download: kuro.download,
          };
        },
      );

      const kuroResponse = await respondWithStream(
        kuroAttempt.result,
        "KuroHost",
        kuroAttempt.servedAudio,
        kuroAttempt.audioFallback,
      );
      if (kuroResponse) return kuroResponse;
    } catch (e) {
      console.error("[kitty/stream] KuroHost stream failed:", e);
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

  if (provider === "AniKuro") {
    try {
      const anikuroAttempt = await fetchWithSubAudioFallback(
        subtitleCtx.audio,
        async (streamAudio) => {
          const anikuro = await fetchAnikuroVideoStream({
            anilistId: subtitleCtx.anilistId,
            episode: subtitleCtx.episode,
            audio: streamAudio,
            serverId: anikuroServer as AnikuroServerId,
            title: titleParam,
            refresh: refreshStream,
          });

          if (!anikuro?.file) return null;

          return {
            file: anikuro.file,
            headers: anikuro.headers,
            tracks: anikuro.tracks,
            allServers: anikuro.allServers,
            skipTimes: anikuro.skipTimes,
            server: anikuro.server,
            download: anikuro.download,
          };
        },
      );

      const anikuroResponse = await respondWithStream(
        anikuroAttempt.result,
        "AniKuro",
        anikuroAttempt.servedAudio,
        anikuroAttempt.audioFallback,
      );
      if (anikuroResponse) return anikuroResponse;
    } catch (e) {
      console.error("[kitty/stream] AniKuro server failed:", e);
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

  if (deferredRaceAttempt) {
    const deferredResponse = await respondWithStream(
      deferredRaceAttempt.result,
      provider,
      deferredRaceAttempt.servedAudio,
      deferredRaceAttempt.audioFallback,
      deferredRaceAttempt.nodeId,
      deferredRaceAttempt.raceMs,
    );
    if (deferredResponse) return deferredResponse;
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
