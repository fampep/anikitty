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

export type CastMediaRequest = {
  url: string;
  contentType: string;
  title?: string;
  currentTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;
};

export type CastLoadResult = {
  ok: boolean;
  error?: string;
  contentId?: string;
  contentType?: string;
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

/** Build the chrome.cast LoadRequest payload (exported for tests). */
export function buildCastLoadRequest(
  media: CastMediaRequest,
  contentId: string,
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
  const request = buildCastLoadRequest(
    { ...media, contentType },
    contentId,
  );
  if (!request) {
    return { ok: false, error: "Could not build Cast load request" };
  }

  try {
    await session.loadMedia(request);
    return { ok: true, contentId, contentType };
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
  error?: string;
}> {
  const prepared = await prepareCastMediaUrl(media.url, media.contentType);
  if (!prepared.ok || !prepared.url) {
    return {
      contentId: "",
      contentType: media.contentType,
      streamType: "BUFFERED",
      autoplay: media.autoplay !== false,
      currentTime: media.currentTime ?? 0,
      error: prepared.error,
    };
  }
  return {
    contentId: prepared.url,
    contentType: prepared.contentType || media.contentType,
    streamType: "BUFFERED",
    autoplay: media.autoplay !== false,
    currentTime: media.currentTime ?? 0,
  };
}
