/**
 * Google Cast Web Sender helpers for the AniKitty player.
 * Loads cast.framework dynamically; no-ops when Cast is unavailable.
 *
 * Uses ambient `cast` / `chrome.cast` types from `src/types/google-cast.d.ts`.
 * Runtime still loads Google’s official sender SDK.
 *
 * Kitty HLS proxy URLs are cookie-bound in the browser. Chromecast cannot send
 * those cookies, so media is reminted via `/api/kitty/cast` before loadMedia.
 */

import {
  kittyStreamChromecastMime,
  resolveKittyStreamType,
  type KittyStreamType,
} from "@/lib/kitty/stream-format";
import { APP_NAME, APP_URL, SITE_LOGO } from "@/lib/seo/site-seo";
import {
  detectSubtitleFormat,
  isOurSubtitleUrl,
  subtitleProxyUrl,
} from "@/lib/subtitles/subtitle-track-utils";

const CAST_SDK_SRC =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

export type CastAvailability = "unknown" | "unavailable" | "available";

export type CastConnectionState =
  | "no_devices"
  | "not_connected"
  | "connecting"
  | "connected";

/**
 * Survives player remounts (next episode) so the local surface can keep
 * showing the cast poster before the Sender SDK re-reports CONNECTED.
 */
let castSessionActiveHint = false;

export function noteCastSessionActive(active: boolean): void {
  castSessionActiveHint = active;
}

export function isCastSessionActiveHint(): boolean {
  return castSessionActiveHint;
}

/** Synchronous peek when the Cast SDK is already loaded (e.g. remount). */
export function peekCastConnectionState(): CastConnectionState {
  if (!hasCastApis()) return "not_connected";
  try {
    const ctx = cast.framework.CastContext.getInstance();
    return mapCastState(ctx.getCastState());
  } catch {
    return "not_connected";
  }
}

/** Soft subtitle track for Chromecast Default Media Receiver (WebVTT). */
export type CastTextTrackRequest = {
  /** Absolute or site-relative caption URL (VTT preferred). */
  url: string;
  label?: string;
  language?: string;
  /** When true, enable this track after loadMedia. */
  active?: boolean;
};

export type CastMediaRequest = {
  url: string;
  contentType: string;
  /** Episode / media title shown on the Cast receiver. */
  title?: string;
  /** Secondary line (series name or "AniKitty"). */
  subtitle?: string;
  /** Anime / series name when known (TvShow-style metadata). */
  seriesTitle?: string;
  /** Episode number when known. */
  episode?: number;
  /** Episode or anime poster URL (absolutized for the receiver). */
  posterUrl?: string;
  currentTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;
  /** Soft WebVTT tracks exposed to the Cast receiver. */
  textTracks?: CastTextTrackRequest[];
};

export type CastLoadResult = {
  ok: boolean;
  error?: string;
  contentId?: string;
  contentType?: string;
  /** Track IDs attached to MediaInfo (1-based, same order as prepared text tracks). */
  textTrackIds?: number[];
  activeTextTrackIds?: number[];
};

type CastApiWindow = Window & {
  __onGCastApiAvailable?: (isAvailable: boolean, reason?: unknown) => void;
};

/** Extra CAF MediaInfo fields not in older ambient typings. */
type CastMediaInfoExtras = chrome.cast.media.MediaInfo & {
  contentUrl?: string;
  hlsSegmentFormat?: string;
  hlsVideoSegmentFormat?: string;
};

let sdkPromise: Promise<boolean> | null = null;
let contextInitialized = false;

function castWin(): CastApiWindow | null {
  if (typeof window === "undefined") return null;
  return window as CastApiWindow;
}

function hasCastApis(): boolean {
  return Boolean(
    typeof cast !== "undefined" &&
      cast?.framework &&
      typeof chrome !== "undefined" &&
      chrome?.cast,
  );
}

/** Cast Sender is not usable on iOS Safari / WebKit-only browsers. */
export function isCastLikelyUnsupported(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }
  return false;
}

/**
 * Dynamically load the Cast Web Sender SDK. Resolves `true` when
 * `cast.framework` is ready, `false` when Cast is unavailable.
 */
export function loadCastSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isCastLikelyUnsupported()) return Promise.resolve(false);

  if (hasCastApis()) return Promise.resolve(true);
  if (sdkPromise) return sdkPromise;

  const w = castWin()!;

  sdkPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    // Must be set before the script runs (or already set if script is present).
    const prev = w.__onGCastApiAvailable;
    w.__onGCastApiAvailable = (isAvailable) => {
      try {
        prev?.(isAvailable);
      } catch {
        /* ignore prior callback errors */
      }
      finish(Boolean(isAvailable && hasCastApis()));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-anikitty-cast="1"]`,
    );
    if (existing) {
      const started = Date.now();
      const poll = () => {
        if (hasCastApis()) {
          finish(true);
          return;
        }
        if (Date.now() - started > 12_000) {
          finish(false);
          return;
        }
        window.setTimeout(poll, 200);
      };
      poll();
      return;
    }

    const script = document.createElement("script");
    script.src = CAST_SDK_SRC;
    script.async = true;
    script.dataset.anikittyCast = "1";
    script.onerror = () => finish(false);
    document.head.appendChild(script);

    window.setTimeout(() => {
      if (!settled) finish(hasCastApis());
    }, 12_000);
  });

  return sdkPromise;
}

export function ensureCastContext(): cast.framework.CastContext | null {
  if (!hasCastApis()) return null;
  const ctx = cast.framework.CastContext.getInstance();
  if (!contextInitialized) {
    try {
      ctx.setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        resumeSavedSession: true,
      });
      contextInitialized = true;
    } catch {
      return null;
    }
  }
  return ctx;
}

export function mapCastState(
  raw: cast.framework.CastState | string,
): CastConnectionState {
  if (!hasCastApis()) return "no_devices";
  if (raw === cast.framework.CastState.NO_DEVICES_AVAILABLE) return "no_devices";
  if (raw === cast.framework.CastState.CONNECTING) return "connecting";
  if (raw === cast.framework.CastState.CONNECTED) return "connected";
  return "not_connected";
}

/** Absolute HTTPS/HTTP URL the Chromecast receiver can fetch. */
export function toAbsoluteCastUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (typeof window === "undefined") return trimmed;
  if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
  try {
    return new URL(trimmed, window.location.href).href;
  } catch {
    return trimmed;
  }
}

export function isCastUrlReachableFromDevice(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }
    if (host.endsWith(".local")) return false;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    // Production Cast requires HTTPS; allow http only for private LAN testing.
    if (parsed.protocol === "http:") {
      return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Absolute HTTPS URL for the AniKitty wordmark the Chromecast can fetch.
 * Prefers the current origin when public; otherwise production anikitty.moe.
 */
export function getCastBrandLogoUrl(): string {
  const production = `${APP_URL.replace(/\/$/, "")}${SITE_LOGO}`;
  if (typeof window === "undefined") return production;
  const local = toAbsoluteCastUrl(SITE_LOGO);
  if (local && isCastUrlReachableFromDevice(local)) return local;
  return production;
}

/** Absolutize an image URL for MediaInfo; null when Chromecast cannot fetch it. */
export function prepareCastImageUrl(url: string | undefined | null): string | null {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return null;
  const absolute = toAbsoluteCastUrl(trimmed);
  if (!absolute || !isCastUrlReachableFromDevice(absolute)) return null;
  return absolute;
}

function buildCastImage(url: string, width?: number, height?: number): chrome.cast.Image {
  const image = new chrome.cast.Image(url);
  if (width) image.width = width;
  if (height) image.height = height;
  return image;
}

/**
 * Rich MediaInfo metadata for Default Media Receiver loading/idle art:
 * poster (when available) + AniKitty logo, title, and brand subtitle.
 */
export function buildCastMediaMetadata(
  media: Pick<
    CastMediaRequest,
    "title" | "subtitle" | "seriesTitle" | "episode" | "posterUrl"
  >,
): chrome.cast.media.GenericMediaMetadata | chrome.cast.media.TvShowMediaMetadata {
  const brandLogo = getCastBrandLogoUrl();
  const poster = prepareCastImageUrl(media.posterUrl);
  const images: chrome.cast.Image[] = [];
  // Poster first so episode art fills the TV while buffering; logo always present.
  if (poster) images.push(buildCastImage(poster));
  images.push(buildCastImage(brandLogo));

  const episodeTitle =
    media.title?.trim() ||
    (media.episode != null ? `Episode ${media.episode}` : APP_NAME);
  const series =
    media.seriesTitle?.trim() ||
    media.subtitle?.trim() ||
    APP_NAME;
  const brandLine =
    media.subtitle?.trim() ||
    (series !== APP_NAME ? `${series} · ${APP_NAME}` : APP_NAME);

  if (
    hasCastApis() &&
    (media.seriesTitle?.trim() || media.episode != null)
  ) {
    const tv = new chrome.cast.media.TvShowMediaMetadata();
    tv.metadataType = chrome.cast.media.MetadataType.TV_SHOW;
    tv.seriesTitle = series;
    tv.title = episodeTitle;
    if (media.episode != null && Number.isFinite(media.episode)) {
      tv.episode = media.episode;
    }
    tv.images = images;
    return tv;
  }

  const generic = new chrome.cast.media.GenericMediaMetadata();
  generic.metadataType = chrome.cast.media.MetadataType.GENERIC;
  generic.title = episodeTitle;
  generic.subtitle = brandLine;
  generic.images = images;
  return generic;
}

export function resolveCastContentType(
  url: string,
  qualities: readonly { file: string }[] = [],
): string {
  const type: KittyStreamType = resolveKittyStreamType(url, qualities);
  return kittyStreamChromecastMime(type);
}

export function createRemotePlayerPair(): {
  player: cast.framework.RemotePlayer;
  controller: cast.framework.RemotePlayerController;
} | null {
  if (!hasCastApis()) return null;
  const player = new cast.framework.RemotePlayer();
  const controller = new cast.framework.RemotePlayerController(player);
  return { player, controller };
}

function formatCastError(err: unknown): string {
  if (!err) return "Cast failed";
  if (typeof err === "string") return err;
  if (typeof err === "number") return `Cast error ${err}`;
  if (typeof err === "object") {
    const e = err as {
      code?: string | number;
      description?: string;
      message?: string;
    };
    const code = e.code != null ? String(e.code) : "";
    const detail = e.description || e.message || "";
    if (code && detail) return `${detail} (${code})`;
    if (detail) return detail;
    if (code) return `Cast error ${code}`;
  }
  return "Cast failed";
}

/**
 * Remint any playback URL into a Chromecast-fetchable absolute HTTPS URL.
 * Always goes through `POST /api/kitty/cast` so every provider path (AniWaves,
 * Anikoto, AniWatch, AniNeko, MKissa, KickAssAnime, KuroHost, …) gets the same
 * cookie-free cast token + CORS treatment — including quality / next-episode
 * reloads that call this again via syncMedia.
 */
export async function prepareCastMediaUrl(
  playbackUrl: string,
  contentTypeHint?: string,
): Promise<CastLoadResult & { url?: string }> {
  const trimmed = playbackUrl.trim();
  if (!trimmed) {
    return { ok: false, error: "No stream URL to cast" };
  }

  try {
    const res = await fetch("/api/kitty/cast", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });
    const data = (await res.json().catch(() => null)) as {
      url?: string;
      contentType?: string;
      error?: string;
    } | null;
    if (!res.ok || !data?.url) {
      return {
        ok: false,
        error:
          data?.error ||
          `Could not prepare Cast stream (${res.status}). Reload and try again.`,
      };
    }
    if (!isCastUrlReachableFromDevice(data.url)) {
      return {
        ok: false,
        error:
          "Chromecast cannot reach this URL (localhost / non-HTTPS). Use a public HTTPS site.",
        contentId: data.url,
      };
    }
    return {
      ok: true,
      url: data.url,
      contentId: data.url,
      contentType:
        data.contentType ||
        contentTypeHint ||
        resolveCastContentType(data.url),
    };
  } catch {
    return {
      ok: false,
      error: "Network error preparing Cast stream. Check your connection.",
    };
  }
}

/**
 * Max soft tracks on a single LoadRequest. Large track lists raise the odds
 * the Default Media Receiver aborts the entire load (CORS / bad cue files).
 */
const CAST_MAX_TEXT_TRACKS = 6;

/**
 * Make a soft-subtitle URL fetchable by the Chromecast receiver.
 * Our `/api/kitty/subtitles` endpoints already CORS-open; external hosts are
 * wrapped through the subtitle proxy (same as local playback).
 *
 * Default Media Receiver only renders WebVTT. ASS/SSA/SRT (and unlabeled
 * cached `/api/kitty/subtitles?id=` files that are not clearly VTT) are
 * skipped — a bad trackContentId can reject the whole loadMedia.
 */
export function prepareCastTextTrackUrl(
  url: string,
  label?: string,
): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const format = detectSubtitleFormat({ url: trimmed, label });
  // DMR cannot render ASS/SRT. URL-less cached ids often default to "vtt" in
  // detectSubtitleFormat — only trust those when the path/extension says VTT
  // or the upstream URL inside a proxy query clearly ends in .vtt.
  if (format === "ass" || format === "srt") return null;
  if (!isLikelyCastWebVttUrl(trimmed, label)) return null;

  let candidate = trimmed;
  if (!isOurSubtitleUrl(candidate) && /^https?:\/\//i.test(candidate)) {
    candidate = subtitleProxyUrl(candidate);
  }

  const absolute = toAbsoluteCastUrl(candidate);
  if (!absolute || !isCastUrlReachableFromDevice(absolute)) return null;
  return absolute;
}

/** True when the URL/label strongly indicates WebVTT (not ASS/SRT/unknown). */
export function isLikelyCastWebVttUrl(url: string, label?: string): boolean {
  const lower = url.toLowerCase();
  const labelLower = (label ?? "").toLowerCase();
  if (
    lower.includes(".ass") ||
    lower.includes(".ssa") ||
    lower.includes(".srt") ||
    labelLower.includes(".ass") ||
    labelLower.includes(".ssa") ||
    labelLower.includes(".srt") ||
    /\bass\b/.test(labelLower) ||
    /\bssa\b/.test(labelLower)
  ) {
    return false;
  }
  if (lower.includes(".vtt") || labelLower.includes(".vtt")) return true;
  // Proxy wraps the upstream URL in ?url= — accept when that target is .vtt.
  try {
    const parsed = new URL(
      lower.startsWith("http")
        ? url
        : typeof window !== "undefined"
          ? new URL(url, window.location.origin).href
          : `https://placeholder.local${url.startsWith("/") ? url : `/${url}`}`,
    );
    if (parsed.pathname.includes("/api/kitty/subtitles/proxy")) {
      const upstream = parsed.searchParams.get("url") ?? "";
      return /\.vtt(\?|#|$)/i.test(upstream);
    }
  } catch {
    /* fall through */
  }
  // Ryuo / known VTT CDN paths without a misleading extension.
  if (/\/s\/\d+\/\d+\/[a-z0-9_-]+\.vtt\b/i.test(lower)) return true;
  return false;
}

export type PreparedCastTextTrack = {
  trackId: number;
  url: string;
  label: string;
  language: string;
  active: boolean;
};

/** Absolutize / proxy castable text tracks; assign stable 1-based trackIds. */
export function prepareCastTextTracks(
  tracks: readonly CastTextTrackRequest[] | undefined,
): PreparedCastTextTrack[] {
  if (!tracks?.length) return [];
  const out: PreparedCastTextTrack[] = [];
  for (const track of tracks) {
    if (out.length >= CAST_MAX_TEXT_TRACKS) break;
    const url = prepareCastTextTrackUrl(track.url, track.label);
    if (!url) continue;
    out.push({
      trackId: out.length + 1,
      url,
      label: track.label?.trim() || `Subtitles ${out.length + 1}`,
      language: track.language?.trim() || "en",
      active: Boolean(track.active),
    });
  }
  return out;
}

function buildDefaultTextTrackStyle(): chrome.cast.media.TextTrackStyle | null {
  if (!hasCastApis()) return null;
  const style = new chrome.cast.media.TextTrackStyle();
  style.backgroundColor = "#00000000";
  style.foregroundColor = "#FFFFFFFF";
  style.edgeType = chrome.cast.media.TextTrackEdgeType.DROP_SHADOW;
  style.edgeColor = "#000000FF";
  style.fontScale = 1;
  style.fontGenericFamily =
    chrome.cast.media.TextTrackFontGenericFamily.SANS_SERIF;
  return style;
}

function editTracksInfoAsync(
  media: chrome.cast.media.Media,
  activeTrackIds: number[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const req = new chrome.cast.media.EditTracksInfoRequest(activeTrackIds);
      media.editTracksInfo(
        req,
        () => resolve(),
        (err) => reject(err),
      );
    } catch (err) {
      reject(err);
    }
  });
}

/** Text track IDs currently attached to the receiver MediaInfo (from loadMedia). */
export function getCastAttachedTextTrackIds(): number[] {
  const ctx = ensureCastContext();
  if (!ctx || !hasCastApis()) return [];
  const media = ctx.getCurrentSession()?.getMediaSession();
  if (!media?.media?.tracks?.length) return [];
  try {
    return media.media.tracks
      .filter((t) => t.type === chrome.cast.media.TrackType.TEXT)
      .map((t) => t.trackId)
      .filter((id) => Number.isFinite(id) && id > 0);
  } catch {
    return [];
  }
}

/**
 * Enable / disable text tracks on the current Cast media session.
 * Pass `[]` to turn captions off on the TV.
 *
 * Never reloads media. Only activates IDs that were attached at loadMedia;
 * on editTracksInfo failure, reverts to `[]` so video keeps playing.
 */
export async function setCastActiveTextTrackIds(
  activeTrackIds: number[],
): Promise<boolean> {
  const ctx = ensureCastContext();
  if (!ctx || !hasCastApis()) return false;
  const media = ctx.getCurrentSession()?.getMediaSession();
  if (!media) return false;

  const requested = activeTrackIds.filter(
    (id) => Number.isFinite(id) && id > 0,
  );

  // Always safe: turn captions off without touching MediaInfo.tracks.
  if (requested.length === 0) {
    try {
      await editTracksInfoAsync(media, []);
      return true;
    } catch {
      return false;
    }
  }

  // DMR cannot add soft tracks mid-session — only activate ones from loadMedia.
  const attached = new Set(getCastAttachedTextTrackIds());
  if (attached.size === 0) return false;
  const filtered = requested.filter((id) => attached.has(id));
  if (filtered.length === 0) return false;

  try {
    await editTracksInfoAsync(media, filtered);
    return true;
  } catch {
    // Revert to no captions; never loadMedia — video stability wins.
    try {
      await editTracksInfoAsync(media, []);
    } catch {
      /* ignore */
    }
    return false;
  }
}

/** Build the chrome.cast LoadRequest payload (exported for tests). */
export function buildCastLoadRequest(
  media: CastMediaRequest,
  contentId: string,
  preparedTracks: readonly PreparedCastTextTrack[] = [],
): chrome.cast.media.LoadRequest | null {
  if (!hasCastApis() || !contentId) return null;

  const contentType =
    media.contentType || resolveCastContentType(contentId);
  const mediaInfo = new chrome.cast.media.MediaInfo(
    contentId,
    contentType,
  ) as CastMediaInfoExtras;
  mediaInfo.contentUrl = contentId;
  mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;

  // Anime Kitty HLS is typically MPEG-TS; CAF defaults to TS when unset, but
  // setting content type explicitly helps Default Media Receiver pick HLS.
  const isHls = /mpegurl|m3u8/i.test(contentType) || contentId.includes(".m3u8");
  if (isHls) {
    // Leave segment format unset → receiver assumes TS (most Kitty sources).
    // fMP4 sources still work when the playlist signals CMAF clearly.
  }

  const metadata = buildCastMediaMetadata(media);
  mediaInfo.metadata = metadata;

  // Attach track metadata for later editTracksInfo toggles, but do not set
  // LoadRequest.activeTrackIds — activating cues during loadMedia can abort
  // the whole item on Default Media Receiver. Enable via editTracksInfo after
  // playback is confirmed (see applyActiveTextTracks).
  if (preparedTracks.length > 0) {
    mediaInfo.tracks = preparedTracks.map((track) => {
      const castTrack = new chrome.cast.media.Track(
        track.trackId,
        chrome.cast.media.TrackType.TEXT,
      );
      castTrack.trackContentId = track.url;
      castTrack.trackContentType = "text/vtt";
      castTrack.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
      castTrack.name = track.label;
      castTrack.language = track.language;
      return castTrack;
    });
    const style = buildDefaultTextTrackStyle();
    if (style) mediaInfo.textTrackStyle = style;
  }

  const request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = media.autoplay !== false;
  if (
    typeof media.currentTime === "number" &&
    Number.isFinite(media.currentTime) &&
    media.currentTime > 0
  ) {
    request.currentTime = media.currentTime;
  }
  return request;
}

/**
 * CAF loadMedia may reject with ErrorCode, or (on some sender builds) resolve
 * with a non-null ErrorCode. Treat either as failure.
 */
async function loadRequestOnSession(
  session: cast.framework.CastSession,
  request: chrome.cast.media.LoadRequest,
): Promise<void> {
  const result = await session.loadMedia(request);
  if (result != null && result !== undefined && String(result) !== "") {
    throw result;
  }
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * After loadMedia resolves, the receiver can still fail while fetching tracks
 * (CORS / bad VTT) and surface IDLE+ERROR. Only treat explicit ERROR as failure
 * so slow buffering does not drop working captions.
 */
async function castLoadFailedAfterTracks(
  session: cast.framework.CastSession,
  watchMs = 1_500,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < watchMs) {
    try {
      const media = session.getMediaSession();
      const reason = String(media?.idleReason ?? "");
      if (reason === "ERROR") return true;
      const state = String(media?.playerState ?? "");
      if (
        state === "PLAYING" ||
        state === "PAUSED" ||
        state === "BUFFERING" ||
        state === "LOADING"
      ) {
        return false;
      }
    } catch {
      /* keep watching */
    }
    await waitMs(200);
  }
  return false;
}

async function applyActiveTextTracks(
  session: cast.framework.CastSession,
  activeTextTrackIds: number[],
): Promise<boolean> {
  if (activeTextTrackIds.length === 0) return true;
  const mediaSession = session.getMediaSession();
  if (!mediaSession) return false;
  try {
    await editTracksInfoAsync(mediaSession, activeTextTrackIds);
    return true;
  } catch {
    // Keep video; do not leave a half-applied caption state.
    try {
      await editTracksInfoAsync(mediaSession, []);
    } catch {
      /* ignore */
    }
    return false;
  }
}

export async function loadMediaOnSession(
  media: CastMediaRequest,
): Promise<CastLoadResult> {
  const ctx = ensureCastContext();
  if (!ctx || !hasCastApis()) {
    return { ok: false, error: "Cast SDK not ready" };
  }

  const session = ctx.getCurrentSession();
  if (!session) {
    return { ok: false, error: "No Cast session" };
  }

  const prepared = await prepareCastMediaUrl(media.url, media.contentType);
  if (!prepared.ok || !prepared.url) {
    return {
      ok: false,
      error: prepared.error || "Could not prepare Cast media URL",
      contentId: prepared.contentId,
    };
  }

  const contentId = prepared.url;
  const contentType = prepared.contentType || media.contentType;
  const preparedTracks = prepareCastTextTracks(media.textTracks);
  const mediaPayload = { ...media, contentType };

  const attemptLoad = async (
    tracks: readonly PreparedCastTextTrack[],
    watchForTrackFailure: boolean,
  ): Promise<CastLoadResult> => {
    const request = buildCastLoadRequest(mediaPayload, contentId, tracks);
    if (!request) {
      return { ok: false, error: "Could not build Cast load request" };
    }
    const activeTextTrackIds = tracks
      .filter((t) => t.active)
      .map((t) => t.trackId);
    const textTrackIds = tracks.map((t) => t.trackId);
    try {
      await loadRequestOnSession(session, request);
      if (
        watchForTrackFailure &&
        tracks.length > 0 &&
        (await castLoadFailedAfterTracks(session))
      ) {
        return {
          ok: false,
          error: "Cast receiver rejected media with text tracks",
          contentId,
          contentType,
          textTrackIds,
          activeTextTrackIds,
        };
      }
      // Activate captions after video is healthy. If activation kills the
      // session, fail so the video-only fallback can recover.
      const captionsOk = await applyActiveTextTracks(
        session,
        activeTextTrackIds,
      );
      if (
        watchForTrackFailure &&
        activeTextTrackIds.length > 0 &&
        (await castLoadFailedAfterTracks(session, 1_000))
      ) {
        return {
          ok: false,
          error: "Cast receiver rejected active text tracks",
          contentId,
          contentType,
          textTrackIds,
          activeTextTrackIds,
        };
      }
      return {
        ok: true,
        contentId,
        contentType,
        textTrackIds,
        activeTextTrackIds: captionsOk ? activeTextTrackIds : [],
      };
    } catch (err) {
      const detail = formatCastError(err);
      const unreachableHint =
        /LOAD_MEDIA_FAILED|load_media_failed|error_code|media.?failed|timeout/i.test(
          detail,
        )
          ? " The Chromecast must reach the stream URL on your network (CORS + HTTPS)."
          : "";
      return {
        ok: false,
        error: `${detail}.${unreachableHint}`.trim(),
        contentId,
        contentType,
        textTrackIds,
        activeTextTrackIds,
      };
    }
  };

  // Prefer video + subs, but never strand a connected session with no media:
  // invalid MediaInfo.tracks / non-CORS cue files commonly fail the whole load.
  if (preparedTracks.length > 0) {
    const withTracks = await attemptLoad(preparedTracks, true);
    if (withTracks.ok) return withTracks;
  }

  const videoOnly = await attemptLoad([], false);
  if (videoOnly.ok) {
    return {
      ...videoOnly,
      textTrackIds: [],
      activeTextTrackIds: [],
    };
  }
  return videoOnly;
}

export function getCastDeviceName(): string | null {
  const ctx = ensureCastContext();
  const session = ctx?.getCurrentSession();
  if (!session) return null;
  try {
    return session.getCastDevice()?.friendlyName || null;
  } catch {
    return null;
  }
}

/** Snapshot of what loadMedia would send (no Cast device required). */
export async function describeCastLoadPayload(
  media: CastMediaRequest,
): Promise<{
  contentId: string;
  contentType: string;
  streamType: string;
  autoplay: boolean;
  currentTime: number;
  textTracks: PreparedCastTextTrack[];
  activeTrackIds: number[];
  title?: string;
  subtitle?: string;
  seriesTitle?: string;
  posterUrl?: string | null;
  brandLogoUrl: string;
  error?: string;
}> {
  const prepared = await prepareCastMediaUrl(media.url, media.contentType);
  const textTracks = prepareCastTextTracks(media.textTracks);
  const activeTrackIds = textTracks.filter((t) => t.active).map((t) => t.trackId);
  const brandLogoUrl = getCastBrandLogoUrl();
  const posterUrl = prepareCastImageUrl(media.posterUrl);
  if (!prepared.ok || !prepared.url) {
    return {
      contentId: "",
      contentType: media.contentType,
      streamType: "BUFFERED",
      autoplay: media.autoplay !== false,
      currentTime: media.currentTime ?? 0,
      textTracks,
      activeTrackIds,
      title: media.title,
      subtitle: media.subtitle,
      seriesTitle: media.seriesTitle,
      posterUrl,
      brandLogoUrl,
      error: prepared.error,
    };
  }
  return {
    contentId: prepared.url,
    contentType: prepared.contentType || media.contentType,
    streamType: "BUFFERED",
    autoplay: media.autoplay !== false,
    currentTime: media.currentTime ?? 0,
    textTracks,
    activeTrackIds,
    title: media.title,
    subtitle: media.subtitle,
    seriesTitle: media.seriesTitle,
    posterUrl,
    brandLogoUrl,
  };
}
