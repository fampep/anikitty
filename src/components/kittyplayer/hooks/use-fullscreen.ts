"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  exitElementFullscreen,
  elementSupportsFullscreenRequest,
  exitVideoWebkitFullscreen,
  getFullscreenElement,
  isElementFullscreen,
  isVideoWebkitFullscreen,
  prefersCssImmersiveFullscreen,
  requestElementFullscreen,
} from "@/lib/kitty/fullscreen";
import {
  tryLockLandscapeOrientation,
} from "@/lib/kitty/player-orientation";
import {
  consumePersistCssFullscreen,
  isCssFullscreenActive,
} from "@/lib/kitty/fullscreen-persist";
import { prefersCssFullscreen } from "../utils";
import type { WebkitVideo } from "../types";

type Options = {
  rootRef: RefObject<HTMLElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  getFullscreenTarget: () => HTMLElement | null;
  autoFullscreen?: boolean;
  bumpControls: () => void;
  setControlsVisible: (v: boolean) => void;
};

export function usePlayerFullscreen({
  rootRef,
  videoRef,
  getFullscreenTarget,
  autoFullscreen,
  bumpControls,
  setControlsVisible,
}: Options) {
  const [fullscreen, setFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen] = useState(false);
  const cssFullscreenRef = useRef(false);
  cssFullscreenRef.current = cssFullscreen;

  const enterCssFullscreen = useCallback(() => {
    setCssFullscreen(true);
    setFullscreen(true);
    void tryLockLandscapeOrientation();
    setControlsVisible(true);
    bumpControls();
  }, [bumpControls, setControlsVisible]);

  useEffect(() => {
    if (!autoFullscreen) return;
    if (!(consumePersistCssFullscreen() || isCssFullscreenActive())) return;
    if (!(prefersCssFullscreen() || isCssFullscreenActive())) return;
    enterCssFullscreen();
  }, [autoFullscreen, enterCssFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const target = getFullscreenTarget();
    const video = videoRef.current as WebkitVideo | null;
    if (!target) return;

    const inCss = cssFullscreenRef.current;
    const inDoc =
      isElementFullscreen(target) ||
      isElementFullscreen(rootRef.current) ||
      Boolean(getFullscreenElement());
    const inWebkit = isVideoWebkitFullscreen(video);

    try {
      if (inCss || inDoc || inWebkit) {
        if (inCss) {
          setCssFullscreen(false);
          setFullscreen(false);
        }
        if (inWebkit && video) {
          try {
            exitVideoWebkitFullscreen(video);
          } catch {
            /* ignore */
          }
        } else if (inDoc) {
          await exitElementFullscreen();
        }
        bumpControls();
        return;
      }

      // iOS (Safari, CriOS, FxiOS, EdgiOS, WebViews): CSS immersive keeps
      // kitty custom chrome. Do not call video.webkitEnterFullscreen() —
      // that swaps to Apple's native controls.
      if (prefersCssImmersiveFullscreen()) {
        enterCssFullscreen();
        return;
      }

      const canElement = elementSupportsFullscreenRequest(target);

      // Desktop Chrome / Firefox / Safari / Android: host Element Fullscreen
      // preserves custom chrome on the player container (not bare <video>).
      if (canElement) {
        try {
          await requestElementFullscreen(target);
          const videoEl = videoRef.current;
          // Some UAs promote bare <video> — reclaim the player host once.
          if (videoEl && getFullscreenElement() === videoEl) {
            await exitElementFullscreen();
            await requestElementFullscreen(target);
          }
          await tryLockLandscapeOrientation();
          if (videoEl && getFullscreenElement() === videoEl) {
            await exitElementFullscreen();
            await requestElementFullscreen(target);
          }
          setFullscreen(true);
          setControlsVisible(true);
          bumpControls();
          return;
        } catch {
          enterCssFullscreen();
          return;
        }
      }

      // Last resort: fixed CSS immersive overlay.
      enterCssFullscreen();
    } catch {
      /* browser may deny fullscreen without gesture */
    }
    bumpControls();
  }, [
    bumpControls,
    enterCssFullscreen,
    getFullscreenTarget,
    rootRef,
    setControlsVisible,
    videoRef,
  ]);

  return {
    fullscreen,
    setFullscreen,
    cssFullscreen,
    setCssFullscreen,
    cssFullscreenRef,
    enterCssFullscreen,
    toggleFullscreen,
  };
}
