"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROOT_CLASS = "watch-theatre-active";

/** Applies document-level theatre mode styling (dim chrome, lock scroll). */
export function useTheatreModeEffects(enabled: boolean) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const onWatch = pathname.startsWith("/anime/watch");
    if (!enabled || !onWatch) {
      root.classList.remove(ROOT_CLASS);
      document.body.style.overflow = "";
      return;
    }

    root.classList.add(ROOT_CLASS);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      root.classList.remove(ROOT_CLASS);
      document.body.style.overflow = prevOverflow;
    };
  }, [enabled, pathname]);
}
