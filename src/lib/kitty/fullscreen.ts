type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitFullScreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
  webkitCancelFullScreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  /** Older Safari spelling (capital S). */
  webkitRequestFullScreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

type WebkitFullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
};

/** Whether the document Fullscreen API is enabled (not just method presence). */
export function isDocumentFullscreenEnabled(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as FullscreenDocument;
  if (typeof doc.fullscreenEnabled === "boolean") return doc.fullscreenEnabled;
  if (typeof doc.webkitFullscreenEnabled === "boolean") {
    return doc.webkitFullscreenEnabled;
  }
  if (typeof doc.webkitFullScreenEnabled === "boolean") {
    return doc.webkitFullScreenEnabled;
  }
  // Older UAs omit the flag — treat method presence as enough.
  return true;
}

/** Current fullscreen element (standard + vendor prefixes). */
export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as FullscreenDocument;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.webkitCurrentFullScreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

export function isElementFullscreen(el: Element | null | undefined): boolean {
  if (!el) return false;
  const fs = getFullscreenElement();
  return fs === el || fs?.contains(el) === true;
}

/** Request fullscreen on an element (standard + vendor prefixes). */
export function requestElementFullscreen(el: HTMLElement): Promise<void> {
  const target = el as FullscreenElement;
  // navigationUI: "hide" asks the UA to hide the browser address / search bar.
  // Safari may reject the options bag — fall back to a bare call.
  if (target.requestFullscreen) {
    return target
      .requestFullscreen({ navigationUI: "hide" })
      .catch(() => target.requestFullscreen!());
  }
  if (target.webkitRequestFullscreen) return target.webkitRequestFullscreen();
  if (target.webkitRequestFullScreen) return target.webkitRequestFullScreen();
  if (target.mozRequestFullScreen) return target.mozRequestFullScreen();
  if (target.msRequestFullscreen) return target.msRequestFullscreen();
  return Promise.reject(new Error("Fullscreen API is not supported"));
}

/** Whether this element exposes a usable Fullscreen API entry point. */
export function elementSupportsFullscreenRequest(el: HTMLElement): boolean {
  if (!isDocumentFullscreenEnabled()) return false;
  const target = el as FullscreenElement;
  return Boolean(
    target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.webkitRequestFullScreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen,
  );
}

/** Exit document fullscreen (standard + vendor prefixes). */
export function exitElementFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.webkitCancelFullScreen) return doc.webkitCancelFullScreen();
  if (doc.mozCancelFullScreen) return doc.mozCancelFullScreen();
  if (doc.msExitFullscreen) return doc.msExitFullscreen();
  return Promise.reject(new Error("Fullscreen API is not supported"));
}

/**
 * iPhone / iPad / iPod — any browser (Safari, CriOS, FxiOS, EdgiOS, WebViews)
 * and iPadOS desktop-UA. All share WebKit fullscreen limits.
 */
export function isIOSLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/**
 * iOS browsers cannot reliably keep custom player chrome with Element FS or
 * video.webkitEnterFullscreen() (native Safari controls). Prefer the CSS
 * immersive host overlay instead.
 */
export function prefersCssImmersiveFullscreen(): boolean {
  return isIOSLike();
}

/** Whether <video> exposes webkitEnterFullscreen (exit / sync only — not default enter). */
export function videoSupportsWebkitFullscreen(
  video: HTMLVideoElement | null | undefined,
): boolean {
  if (!video) return false;
  const wk = video as WebkitFullscreenVideo;
  if (typeof wk.webkitEnterFullscreen !== "function") return false;
  // Prefer the capability flag when present; some builds omit it.
  if (wk.webkitSupportsFullscreen === false) return false;
  return true;
}

export function isVideoWebkitFullscreen(
  video: HTMLVideoElement | null | undefined,
): boolean {
  if (!video) return false;
  return Boolean((video as WebkitFullscreenVideo).webkitDisplayingFullscreen);
}

/**
 * Native video.webkitEnterFullscreen — opt-in / sync only. Default iOS enter
 * path is CSS immersive (keeps kitty chrome). Must run in a user-gesture stack.
 */
export function requestVideoWebkitFullscreen(video: HTMLVideoElement): void {
  const wk = video as WebkitFullscreenVideo;
  if (typeof wk.webkitEnterFullscreen !== "function") {
    throw new Error("webkitEnterFullscreen is not supported");
  }
  wk.webkitEnterFullscreen();
}

export function exitVideoWebkitFullscreen(video: HTMLVideoElement): void {
  const wk = video as WebkitFullscreenVideo;
  if (typeof wk.webkitExitFullscreen !== "function") {
    throw new Error("webkitExitFullscreen is not supported");
  }
  wk.webkitExitFullscreen();
}

const FULLSCREEN_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
] as const;

/** Subscribe to fullscreen changes across browsers. */
export function onFullscreenChange(handler: () => void): () => void {
  for (const type of FULLSCREEN_EVENTS) {
    document.addEventListener(type, handler);
  }
  return () => {
    for (const type of FULLSCREEN_EVENTS) {
      document.removeEventListener(type, handler);
    }
  };
}
