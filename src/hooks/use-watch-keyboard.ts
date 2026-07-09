"use client";

import { useEffect } from "react";
import type Artplayer from "artplayer";

type Options = {
  enabled?: boolean;
  art: Artplayer | null;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onToggleTheatre?: () => void;
  onCopyShareLink?: () => void;
  onShowShortcuts?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * Elements where Space has its own meaning (activating a button, following a
 * link, toggling a details summary). Stealing Space from these breaks them.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  const el = target.closest(
    'button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [contenteditable="true"]',
  );
  return el !== null;
}

/** Is any part of the player on screen? */
function isPlayerVisible(art: Artplayer | null): boolean {
  const el = art?.template?.$player as HTMLElement | undefined;
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
}

export function useWatchKeyboard({
  enabled = true,
  art,
  onPrevEpisode,
  onNextEpisode,
  onToggleTheatre,
  onCopyShareLink,
  onShowShortcuts,
  hasPrev,
  hasNext,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === "?" || (key === "h" && e.shiftKey)) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      if (key === "t") {
        e.preventDefault();
        onToggleTheatre?.();
        return;
      }

      if (key === "c") {
        e.preventDefault();
        onCopyShareLink?.();
        return;
      }

      if (key === "n" || key === "]") {
        if (!hasNext) return;
        e.preventDefault();
        onNextEpisode?.();
        return;
      }

      if (key === "p" || key === "[") {
        if (!hasPrev) return;
        e.preventDefault();
        onPrevEpisode?.();
        return;
      }

      if (!art) return;

      if (key === "f") {
        e.preventDefault();
        art.fullscreen = !art.fullscreen;
        return;
      }

      if (key === "m") {
        e.preventDefault();
        art.muted = !art.muted;
        return;
      }

      const isSpace = e.code === "Space" || key === " " || key === "spacebar";
      if (isSpace || key === "k") {
        // `k` is the explicit play/pause key and always applies. Space, though,
        // is shared with the page: let it activate a focused button/link, and
        // let it scroll when the player is scrolled out of view (e.g. while
        // reading comments) instead of silently pausing playback.
        if (isSpace && (isInteractiveTarget(e.target) || !isPlayerVisible(art))) return;
        e.preventDefault();
        art.toggle();
        return;
      }

      if (key === "arrowleft" || key === "j") {
        e.preventDefault();
        art.backward = 10;
        return;
      }

      if (key === "arrowright" || key === "l") {
        e.preventDefault();
        art.forward = 10;
        return;
      }

      if (key === "arrowup") {
        e.preventDefault();
        art.volume = Math.min(1, art.volume + 0.1);
        return;
      }

      if (key === "arrowdown") {
        e.preventDefault();
        art.volume = Math.max(0, art.volume - 0.1);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    enabled,
    art,
    onPrevEpisode,
    onNextEpisode,
    onToggleTheatre,
    onCopyShareLink,
    onShowShortcuts,
    hasPrev,
    hasNext,
  ]);
}
