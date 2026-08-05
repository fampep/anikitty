"use client";

import { useEffect } from "react";
import type { PlayerController } from "@/lib/player/player-controller";
import {
  KITTY_PLAYER_SPEEDS,
  saveKittyPlayerPrefs,
} from "@/components/kittyplayer";

type Options = {
  enabled?: boolean;
  player: PlayerController | null;
  seekStepSeconds?: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onToggleTheatre?: () => void;
  theatreMode?: boolean;
  onExitTheatre?: () => void;
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

/**
 * True when the key landed inside a panel that scrolls on its own (episode
 * playlist, related rail). Those are focusable regions, so Arrow/Page/Home must
 * reach the browser's native scrolling instead of being claimed for volume.
 */
function isInsideScrollRegion(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && Boolean(target.closest(".site-thin-scroll"))
  );
}

function isInsideAniKittyPlayer(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest(".anikitty-player"))
  );
}

function isAniKittyPlayerActive(target: EventTarget | null): boolean {
  if (isInsideAniKittyPlayer(target)) return true;
  if (typeof document === "undefined") return false;
  const root = document.querySelector(".anikitty-player");
  if (!root) return false;
  if (root.matches(":hover")) return true;
  const fs = document.fullscreenElement;
  return Boolean(fs && (fs === root || root.contains(fs)));
}

function nudgeRate(video: HTMLVideoElement, direction: 1 | -1) {
  const speeds = KITTY_PLAYER_SPEEDS;
  const current = video.playbackRate || 1;
  let idx = speeds.findIndex((r) => Math.abs(r - current) < 0.001);
  if (idx < 0) idx = speeds.indexOf(1);
  const nextIdx = Math.min(speeds.length - 1, Math.max(0, idx + direction));
  const next = speeds[nextIdx] ?? 1;
  video.playbackRate = next;
  saveKittyPlayerPrefs({ playbackRate: next });
}

export function useWatchKeyboard({
  enabled = true,
  player,
  seekStepSeconds = 10,
  onPrevEpisode,
  onNextEpisode,
  onToggleTheatre,
  theatreMode,
  onExitTheatre,
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
      const playerActive = isAniKittyPlayerActive(e.target);
      const scrollRegion = isInsideScrollRegion(e.target);

      if (key === "?" || (key === "h" && e.shiftKey)) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }

      if (key === "escape" && theatreMode) {
        e.preventDefault();
        onExitTheatre?.();
        return;
      }

      if (key === "t") {
        e.preventDefault();
        onToggleTheatre?.();
        return;
      }

      // C = captions while the player is active; Shift+C always copies.
      if (key === "c") {
        if (playerActive && !e.shiftKey) return;
        e.preventDefault();
        onCopyShareLink?.();
        return;
      }

      if (key === "n") {
        if (!hasNext) return;
        e.preventDefault();
        onNextEpisode?.();
        return;
      }

      if (key === "p") {
        if (!hasPrev) return;
        e.preventDefault();
        onPrevEpisode?.();
        return;
      }

      if (!player) return;
      const video = player.video;

      if (key === "[" || key === "]") {
        if (!video) return;
        // Prefer the in-player handler (gesture hints) when the surface is active.
        if (playerActive) return;
        e.preventDefault();
        nudgeRate(video, key === "]" ? 1 : -1);
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        if (playerActive) return;
        const dur = player.duration;
        if (!(dur > 0)) return;
        e.preventDefault();
        player.seek((Number(e.key) / 10) * dur);
        return;
      }

      if (key === "arrowleft" || key === "j") {
        if (playerActive) return;
        e.preventDefault();
        player.seek(Math.max(0, player.currentTime - seekStepSeconds));
        return;
      }

      if (key === "arrowright" || key === "l") {
        if (playerActive) return;
        e.preventDefault();
        player.seek(player.currentTime + seekStepSeconds);
        return;
      }

      if (key === "arrowup") {
        if (playerActive || scrollRegion) return;
        e.preventDefault();
        player.setVolume(Math.min(1, player.volume + 0.1));
        return;
      }

      if (key === "arrowdown") {
        if (playerActive || scrollRegion) return;
        e.preventDefault();
        player.setVolume(Math.max(0, player.volume - 0.1));
        return;
      }

      if (key === "m") {
        if (playerActive) return;
        e.preventDefault();
        player.setMuted(!player.muted);
        return;
      }

      if (key === "f") {
        if (playerActive) return;
        e.preventDefault();
        player.toggleFullscreen();
        return;
      }

      const isSpace = e.code === "Space" || key === " " || key === "spacebar";
      if (isSpace || key === "k") {
        if (playerActive) return;
        if (isSpace && (isInteractiveTarget(e.target) || !isPlayerVisible(player))) return;
        e.preventDefault();
        player.toggle();
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
    theatreMode,
    onExitTheatre,
    onCopyShareLink,
    onShowShortcuts,
    hasPrev,
    hasNext,
  ]);
}
