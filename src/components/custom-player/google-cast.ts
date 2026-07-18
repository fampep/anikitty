/**
 * Google Cast Web Sender helpers for the custom player.
 * Loads cast.framework dynamically; no-ops when Cast is unavailable.
 *
 * Uses ambient `cast` / `chrome.cast` types (available via the project’s
 * Cast typings). Runtime still loads Google’s official sender SDK.
 */

import {
  kittyStreamChromecastMime,
  resolveKittyStreamType,
  type KittyStreamType,
} from "@/lib/kitty/stream-format";

const CAST_SDK_SRC =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

export type CastAvailability = "unknown" | "unavailable" | "available";

export type CastConnectionState =
  | "no_devices"
  | "not_connected"
  | "connecting"
  | "connected";

export type CastMediaRequest = {
  url: string;
  contentType: string;
  title?: string;
  currentTime?: number;
  autoplay?: boolean;
  muted?: boolean;
  volume?: number;
};

type CastApiWindow = Window & {
  __onGCastApiAvailable?: (isAvailable: boolean, reason?: unknown) => void;
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

export async function loadMediaOnSession(
  media: CastMediaRequest,
): Promise<boolean> {
  const ctx = ensureCastContext();
  if (!ctx || !hasCastApis()) return false;

  const session = ctx.getCurrentSession();
  if (!session) return false;

  const contentId = toAbsoluteCastUrl(media.url);
  if (!contentId) return false;

  const mediaInfo = new chrome.cast.media.MediaInfo(
    contentId,
    media.contentType,
  );
  mediaInfo.streamType = chrome.cast.media.StreamType.BUFFERED;
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

  try {
    await session.loadMedia(request);
    return true;
  } catch {
    return false;
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
