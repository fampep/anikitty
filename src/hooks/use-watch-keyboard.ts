"use client";

import { useEffect } from "react";
import type { PlayerController } from "@/lib/player/player-controller";

type Options = {
  enabled?: boolean;
  player: PlayerController | null;
  seekStepSeconds?: number;
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

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  const el = target.closest(
    'button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [contenteditable="true"]',
  );
  return el !== null;
}

function isPlayerVisible(player: PlayerController | null): boolean {
  const el = player?.video;
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
}

export function useWatchKeyboard({
  enabled = true,
  player,
  seekStepSeconds = 10,
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

      if (!player) return;

      if (key === "f") {
        e.preventDefault();
        player.toggleFullscreen();
        return;
      }

      if (key === "m") {
        e.preventDefault();
        player.setMuted(!player.muted);
        return;
      }

      const isSpace = e.code === "Space" || key === " " || key === "spacebar";
      if (isSpace || key === "k") {
        if (isSpace && (isInteractiveTarget(e.target) || !isPlayerVisible(player))) return;
        e.preventDefault();
        player.toggle();
        return;
      }

      if (key === "arrowleft" || key === "j") {
        e.preventDefault();
        player.seek(Math.max(0, player.currentTime - seekStepSeconds));
        return;
      }

      if (key === "arrowright" || key === "l") {
        e.preventDefault();
        player.seek(player.currentTime + seekStepSeconds);
        return;
      }

      if (key === "arrowup") {
        e.preventDefault();
        player.setVolume(Math.min(1, player.volume + 0.1));
        return;
      }

      if (key === "arrowdown") {
        e.preventDefault();
        player.setVolume(Math.max(0, player.volume - 0.1));
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    enabled,
    player,
    seekStepSeconds,
    onPrevEpisode,
    onNextEpisode,
    onToggleTheatre,
    onCopyShareLink,
    onShowShortcuts,
    hasPrev,
    hasNext,
  ]);
}
