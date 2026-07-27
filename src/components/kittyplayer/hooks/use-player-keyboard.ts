"use client";

import { useEffect, type RefObject } from "react";

/**
 * Placeholder for keyboard shortcut extraction from kitty-player.tsx.
 * Global keydown handling still lives in the shell; this hook owns the
 * future cut point so imports stay stable.
 */
export function usePlayerKeyboard(_opts: {
  rootRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
}) {
  useEffect(() => {
    /* keyboard remains in kitty-player until fully extracted */
  }, []);
}
