"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { IDLE_MS, TOUCH_DOUBLE_TAP_MS } from "../constants";

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  seekingRef: RefObject<boolean>;
  chromePinnedRef: RefObject<boolean>;
  popoverOpenRef: RefObject<boolean>;
  castingRef: RefObject<boolean>;
  castRemotePlayingRef: RefObject<boolean>;
  closePopovers: () => void;
};

/**
 * Show/hide player chrome on idle while playing (or while Cast is playing).
 */
export function useChromeIdle({
  videoRef,
  seekingRef,
  chromePinnedRef,
  popoverOpenRef,
  castingRef,
  castRemotePlayingRef,
  closePopovers,
}: Options) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsVisibleRef = useRef(controlsVisible);
  controlsVisibleRef.current = controlsVisible;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealGuardUntilRef = useRef(0);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const bumpControls = useCallback(
    (opts?: { hideAfterMs?: number }) => {
      setControlsVisible(true);
      clearIdleTimer();
      if (seekingRef.current) return;
      if (chromePinnedRef.current || popoverOpenRef.current) return;
      const hideAfterMs = opts?.hideAfterMs ?? IDLE_MS;
      if (castingRef.current) {
        if (!castRemotePlayingRef.current) return;
        idleTimerRef.current = setTimeout(() => {
          if (popoverOpenRef.current || chromePinnedRef.current) return;
          setControlsVisible(false);
          closePopovers();
        }, hideAfterMs);
        return;
      }
      const video = videoRef.current;
      if (!video || video.paused) return;
      idleTimerRef.current = setTimeout(() => {
        if (popoverOpenRef.current || chromePinnedRef.current) return;
        setControlsVisible(false);
        closePopovers();
      }, hideAfterMs);
    },
    [
      castRemotePlayingRef,
      castingRef,
      chromePinnedRef,
      clearIdleTimer,
      closePopovers,
      popoverOpenRef,
      seekingRef,
      videoRef,
    ],
  );

  const revealControlsFromTouch = useCallback(() => {
    const wasHidden = !controlsVisibleRef.current;
    bumpControls();
    if (wasHidden) {
      revealGuardUntilRef.current = Date.now() + TOUCH_DOUBLE_TAP_MS + 120;
    }
  }, [bumpControls]);

  const hideControls = useCallback(() => {
    if (popoverOpenRef.current || seekingRef.current) return;
    clearIdleTimer();
    setControlsVisible(false);
    closePopovers();
  }, [clearIdleTimer, closePopovers, popoverOpenRef, seekingRef]);

  return {
    controlsVisible,
    setControlsVisible,
    controlsVisibleRef,
    idleTimerRef,
    revealGuardUntilRef,
    clearIdleTimer,
    bumpControls,
    revealControlsFromTouch,
    hideControls,
  };
}
