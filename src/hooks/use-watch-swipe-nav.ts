"use client";

import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  /** Limit swipe detection to this element (player root). Defaults to window — avoid. */
  targetRef?: React.RefObject<HTMLElement | null>;
  onPrev?: () => void;
  onNext?: () => void;
  thresholdPx?: number;
};

export function useWatchSwipeNav({
  enabled = true,
  targetRef,
  onPrev,
  onNext,
  thresholdPx = 72,
}: Options) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const target = targetRef?.current ?? null;
    if (targetRef && !target) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      // Ignore swipes that start on interactive controls / scrollable sheets.
      const el = e.target;
      if (
        el instanceof Element &&
        el.closest(
          'button, a, input, textarea, select, [role="slider"], [data-no-episode-swipe], .vds-controls',
        )
      ) {
        startRef.current = null;
        return;
      }
      startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start || e.changedTouches.length !== 1) return;

      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < thresholdPx) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.25) return;

      if (dx > 0) onPrev?.();
      else onNext?.();
    };

    const node: HTMLElement | Window = target ?? window;
    node.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    node.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart as EventListener);
      node.removeEventListener("touchend", onTouchEnd as EventListener);
    };
  }, [enabled, targetRef, onPrev, onNext, thresholdPx]);
}
