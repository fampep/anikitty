"use client";

import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  thresholdPx?: number;
};

export function useWatchSwipeNav({
  enabled = true,
  onPrev,
  onNext,
  thresholdPx = 72,
}: Options) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
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

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onPrev, onNext, thresholdPx]);
}
