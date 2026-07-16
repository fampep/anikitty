"use client";

import { useEffect } from "react";

const ROOT_CLASS = "watch-theatre-active";

/** Applies document-level theatre mode styling (dim chrome, lock scroll). */
export function useTheatreModeEffects(enabled: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.classList.remove(ROOT_CLASS);
      return;
    }

    root.classList.add(ROOT_CLASS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      root.classList.remove(ROOT_CLASS);
      document.body.style.overflow = prevOverflow;
    };
  }, [enabled]);
}
