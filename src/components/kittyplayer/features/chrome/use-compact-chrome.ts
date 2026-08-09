"use client";

/**
 * Narrow-player detection for the control bar.
 *
 * Matches how embed players behave: the bar slims down based on the player's
 * own width, not the viewport, so a minimized or side-column player drops its
 * non-essential icons even on a wide screen.
 */

import { useEffect, useState, type RefObject } from "react";

/** Below this player width the bar switches to its compact icon set. */
const COMPACT_MAX_PX = 580;

export function useCompactChrome(rootRef: RefObject<HTMLDivElement | null>): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const update = (width: number) => {
      setCompact(width > 0 && width < COMPACT_MAX_PX);
    };

    update(root.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      update(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [rootRef]);

  return compact;
}
