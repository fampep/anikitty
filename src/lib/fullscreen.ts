type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

/** Current fullscreen element (standard + vendor prefixes). */
export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as FullscreenDocument;
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
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
  if (target.requestFullscreen) return target.requestFullscreen();
  if (target.webkitRequestFullscreen) return target.webkitRequestFullscreen();
  if (target.mozRequestFullScreen) return target.mozRequestFullScreen();
  if (target.msRequestFullscreen) return target.msRequestFullscreen();
  return Promise.reject(new Error("Fullscreen API is not supported"));
}

/** Exit document fullscreen (standard + vendor prefixes). */
export function exitElementFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  if (doc.mozCancelFullScreen) return doc.mozCancelFullScreen();
  if (doc.msExitFullscreen) return doc.msExitFullscreen();
  return Promise.reject(new Error("Fullscreen API is not supported"));
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
