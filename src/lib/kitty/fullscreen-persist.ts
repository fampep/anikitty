/**
 * Sticky CSS-fullscreen flag for episode transitions.
 * The keyed player owns `cssFullscreen` React state; remounts would otherwise
 * tear down `anikitty-css-fs` on <html>/<body>. Parent sets this before nav.
 */
let persistCssFullscreen = false;

export function markPersistCssFullscreen(next = true): void {
  persistCssFullscreen = next;
}

export function consumePersistCssFullscreen(): boolean {
  const v = persistCssFullscreen;
  persistCssFullscreen = false;
  return v;
}

export function peekPersistCssFullscreen(): boolean {
  return persistCssFullscreen;
}

export function isCssFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("anikitty-css-fs");
}
