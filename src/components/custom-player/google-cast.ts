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
import {
  detectSubtitleFormat,
  isOurSubtitleUrl,
  subtitleProxyUrl,
} from "@/lib/subtitles/subtitle-track-utils";

/** Inline check — avoid importing Node `crypto` HLS token helpers into the client bundle. */
function isKittyHlsProxyUrl(url: string): boolean {
  return url.trim().includes("/api/kitty/hls");
}

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
  title?: string;
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
 * Remint Kitty HLS proxy URLs into Cast-friendly absolute HTTPS URLs.
 * Non-proxy URLs are absolutized locally.
 */
export async function prepareCastMediaUrl(
  playbackUrl: string,
  contentTypeHint?: string,
): Promise<CastLoadResult & { url?: string }> {
  const trimmed = playbackUrl.trim();
  if (!trimmed) {
    return { ok: false, error: "No stream URL to cast" };
  }

  if (!isKittyHlsProxyUrl(trimmed)) {
    const absolute = toAbsoluteCastUrl(trimmed);
    if (!absolute) {
      return { ok: false, error: "Invalid stream URL" };
    }
    if (!isCastUrlReachableFromDevice(absolute)) {
      return {
        ok: false,
        error:
          "Chromecast cannot reach this URL (localhost / non-HTTPS). Use a public HTTPS site.",
        contentId: absolute,
      };
    }
    return {
      ok: true,
      url: absolute,
      contentId: absolute,
      contentType:
        contentTypeHint || resolveCastContentType(absolute),
    };
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
 * Make a soft-subtitle URL fetchable by the Chromecast receiver.
 * Our `/api/kitty/subtitles` endpoints already CORS-open; external hosts are
 * wrapped through the subtitle proxy (same as local playback).
 * ASS/SSA tracks are skipped — Default Media Receiver only renders WebVTT.
 */
export function prepareCastTextTrackUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const format = detectSubtitleFormat({ url: trimmed });
  if (format === "ass") return null;

  let candidate = trimmed;
  if (!isOurSubtitleUrl(candidate) && /^https?:\/\//i.test(candidate)) {
    candidate = subtitleProxyUrl(candidate);
  }

  const absolute = toAbsoluteCastUrl(candidate);
  if (!absolute || !isCastUrlReachableFromDevice(absolute)) return null;
  return absolute;
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
    const url = prepareCastTextTrackUrl(track.url);
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

/**
 * Enable / disable text tracks on the current Cast media session.
 * Pass `[]` to turn captions off on the TV.
 */
export async function setCastActiveTextTrackIds(
  activeTrackIds: number[],
): Promise<boolean> {
  const ctx = ensureCastContext();
  if (!ctx || !hasCastApis()) return false;
  const media = ctx.getCurrentSession()?.getMediaSession();
  if (!media) return false;
  try {
    await editTracksInfoAsync(media, activeTrackIds);
    return true;
  } catch {
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

  const metadata = new chrome.cast.media.GenericMediaMetadata();
  metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
  if (media.title) metadata.title = media.title;
  mediaInfo.metadata = metadata;

  const activeTrackIds: number[] = [];
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
      if (track.active) activeTrackIds.push(track.trackId);
      return castTrack;
    });
    const style = buildDefaultTextTrackStyle();
    if (style) mediaInfo.textTrackStyle = style;
  }

  const request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = media.autoplay !== false;
  if (activeTrackIds.length > 0) {
    request.activeTrackIds = activeTrackIds;
  }
  if (
    typeof media.currentTime === "number" &&
    Number.isFinite(media.currentTime) &&
    media.currentTime > 0
  ) {
    request.currentTime = media.currentTime;
  }
  return request;
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
  const request = buildCastLoadRequest(
    { ...media, contentType },
    contentId,
    preparedTracks,
  );
  if (!request) {
    return { ok: false, error: "Could not build Cast load request" };
  }

  const activeTextTrackIds = preparedTracks
    .filter((t) => t.active)
    .map((t) => t.trackId);
  const textTrackIds = preparedTracks.map((t) => t.trackId);

  try {
    await session.loadMedia(request);
    // Some receivers honor LoadRequest.activeTrackIds; others need an explicit
    // editTracksInfo after media is ready (esp. when resuming / replacing).
    if (preparedTracks.length > 0) {
      const mediaSession = session.getMediaSession();
      if (mediaSession) {
        try {
          await editTracksInfoAsync(mediaSession, activeTextTrackIds);
        } catch {
          /* load succeeded; captions may still work via activeTrackIds */
        }
      }
    }
    return {
      ok: true,
      contentId,
      contentType,
      textTrackIds,
      activeTextTrackIds,
    };
  } catch (err) {
    const detail = formatCastError(err);
    const unreachableHint =
      /LOAD_MEDIA_FAILED|error_code|media.?failed|timeout/i.test(detail)
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
  error?: string;
}> {
  const prepared = await prepareCastMediaUrl(media.url, media.contentType);
  const textTracks = prepareCastTextTracks(media.textTracks);
  const activeTrackIds = textTracks.filter((t) => t.active).map((t) => t.trackId);
  if (!prepared.ok || !prepared.url) {
    return {
      contentId: "",
      contentType: media.contentType,
      streamType: "BUFFERED",
      autoplay: media.autoplay !== false,
      currentTime: media.currentTime ?? 0,
      textTracks,
      activeTrackIds,
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
  };
}
