"use client";

/** Hold landscape while the player owns the screen; release it on the way out. */

import { useEffect } from "react";

import {
  tryLockLandscapeOrientation,
  tryUnlockScreenOrientation,
} from "@/lib/kitty/player-orientation";

export function useOrientationLock({
  fullscreen,
  cssFullscreen,
}: {
  fullscreen: boolean;
  cssFullscreen: boolean;
}): void {
  useEffect(() => {
    if (fullscreen || cssFullscreen) {
      void tryLockLandscapeOrientation();
      return () => {
        void tryUnlockScreenOrientation();
      };
    }
    void tryUnlockScreenOrientation();
  }, [fullscreen, cssFullscreen]);
}
