"use client";

import { useEffect, useRef } from "react";

/** Runs callback on an interval only while the document tab is visible. */
export function useIntervalWhenVisible(callback: () => void, ms: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled || ms <= 0) return;

    let id: ReturnType<typeof setInterval> | null = null;

    const tick = () => saved.current();
    const start = () => {
      if (id !== null) return;
      id = setInterval(tick, ms);
    };
    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };
    const sync = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ms, enabled]);
}
