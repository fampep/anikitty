"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { clamp } from "../clamp";

const VERTICAL_LOCK_PX = 14;
const HORIZONTAL_LOCK_PX = 22;
const LONG_PRESS_HOLD_MS = 360;
/** Max drift before a pending long-press is cancelled (avoids accidental 2×). */
const LONG_PRESS_MOVE_CANCEL_PX = 10;
/** While holding 2×, cancel if finger slides too far (accidental scrub). */
const HOLD_SPEED_CANCEL_PX = 48;
/** Minimum horizontal drag before swipe-seek locks in. */
const SEEK_LOCK_PX = 28;
/** Full width ≈ this many seek-steps of time. */
const SEEK_WIDTH_STEPS = 3.5;

export type SurfaceGestureHandlers = {
  onSeekFlash: (side: "left" | "right") => void;
  onSeekBy: (delta: number) => void;
  onToggleFullscreen: () => void;
  onSingleTap: () => void;
  onVolumeDelta: (delta: number) => void;
  onBrightnessDelta: (delta: number) => void;
  onHoldSpeedStart: () => void;
  onHoldSpeedEnd: () => void;
  /** Optional tactile pulse (seek lock-in, hold-speed start). */
  onHaptic?: (kind: "seek" | "hold" | "volume") => void;
  seekingActive: () => boolean;
  seekStep: number;
  /** Horizontal swipe seeks when true; otherwise horizontal motion aborts (episode swipe). */
  swipeSeekEnabled?: boolean;
  doubleTapMs?: number;
  doubleTapPx?: number;
};

type GestureMode = "none" | "volume" | "brightness" | "hold-speed" | "seek";

/**
 * Mobile surface gestures: double-tap seek / FS, vertical volume (right) /
 * brightness (left), hold-to-2×, and optional horizontal swipe seek.
 */
export function useSurfaceGestures(handlers: SurfaceGestureHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    zone: "left" | "right" | "center";
    mode: GestureMode;
    moved: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    seekAcc: number;
  } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  const clearSingleTap = useCallback(() => {
    if (singleTapTimerRef.current) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
  }, []);

  const clearLongPress = useCallback(() => {
    const p = pointerRef.current;
    if (p?.longPressTimer) {
      clearTimeout(p.longPressTimer);
      p.longPressTimer = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLVideoElement>) => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (handlersRef.current.seekingActive()) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const third = rect.width / 3;
      const zone: "left" | "right" | "center" =
        x < third ? "left" : x > third * 2 ? "right" : "center";

      clearLongPress();
      pointerRef.current = {
        id: e.pointerId,
        startX: x,
        startY: y,
        lastX: x,
        lastY: y,
        zone,
        mode: "none",
        moved: false,
        longPressTimer: setTimeout(() => {
          const p = pointerRef.current;
          if (!p || p.mode !== "none" || p.moved) return;
          p.mode = "hold-speed";
          suppressClickRef.current = true;
          handlersRef.current.onHaptic?.("hold");
          handlersRef.current.onHoldSpeedStart();
        }, LONG_PRESS_HOLD_MS),
        seekAcc: 0,
      };
    },
    [clearLongPress],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLVideoElement>) => {
      const p = pointerRef.current;
      if (!p || p.id !== e.pointerId) return;
      if (handlersRef.current.seekingActive()) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dx = x - p.startX;
      const dy = y - p.startY;
      const dist = Math.hypot(dx, dy);

      if (p.mode === "hold-speed") {
        // Large slide while holding cancels 2× (avoids fighting scrub intent).
        if (dist > HOLD_SPEED_CANCEL_PX) {
          clearLongPress();
          handlersRef.current.onHoldSpeedEnd();
          pointerRef.current = null;
          suppressClickRef.current = true;
        }
        return;
      }

      if (p.mode === "seek") {
        const deltaX = x - p.lastX;
        p.lastX = x;
        p.lastY = y;
        const step = handlersRef.current.seekStep;
        const seconds = (deltaX / Math.max(rect.width, 1)) * step * SEEK_WIDTH_STEPS;
        p.seekAcc += seconds;
        if (Math.abs(p.seekAcc) >= 0.35) {
          const apply = p.seekAcc;
          p.seekAcc = 0;
          handlersRef.current.onSeekBy(apply);
          handlersRef.current.onSeekFlash(apply < 0 ? "left" : "right");
        }
        return;
      }

      if (p.mode === "none") {
        // Cancel pending long-press as soon as the finger clearly moves.
        if (p.longPressTimer && dist > LONG_PRESS_MOVE_CANCEL_PX) {
          clearLongPress();
        }

        const horizontalDominant = Math.abs(dx) > Math.abs(dy);
        if (horizontalDominant && Math.abs(dx) > SEEK_LOCK_PX) {
          if (handlersRef.current.swipeSeekEnabled) {
            clearLongPress();
            p.mode = "seek";
            p.moved = true;
            p.lastX = x;
            suppressClickRef.current = true;
            lastTapRef.current = null;
            clearSingleTap();
            handlersRef.current.onHaptic?.("seek");
            return;
          }
          // Swipe-seek off: abort so episode swipe can own the gesture.
          if (Math.abs(dx) > HORIZONTAL_LOCK_PX) {
            clearLongPress();
            pointerRef.current = null;
            return;
          }
        }

        if (Math.abs(dy) < VERTICAL_LOCK_PX) return;
        if (Math.abs(dy) <= Math.abs(dx)) return;

        clearLongPress();
        p.moved = true;
        p.mode = p.zone === "left" ? "brightness" : "volume";
        suppressClickRef.current = true;
        lastTapRef.current = null;
        clearSingleTap();
        handlersRef.current.onHaptic?.("volume");
      }

      const deltaY = y - p.lastY;
      p.lastY = y;
      // Swipe up = increase (screen coordinates: up is negative dy).
      const delta = (-deltaY / rect.height) * 1.35;
      if (p.mode === "volume") {
        handlersRef.current.onVolumeDelta(delta);
      } else if (p.mode === "brightness") {
        handlersRef.current.onBrightnessDelta(delta);
      }
    },
    [clearLongPress, clearSingleTap],
  );

  const finishPointer = useCallback(
    (e: ReactPointerEvent<HTMLVideoElement>) => {
      const p = pointerRef.current;
      if (!p || p.id !== e.pointerId) return;

      clearLongPress();
      const mode = p.mode;
      const leftover = p.seekAcc;
      pointerRef.current = null;

      if (mode === "hold-speed") {
        handlersRef.current.onHoldSpeedEnd();
        suppressClickRef.current = true;
        return;
      }

      if (mode === "volume" || mode === "brightness" || mode === "seek") {
        if (mode === "seek" && Math.abs(leftover) >= 0.2) {
          handlersRef.current.onSeekBy(leftover);
        }
        suppressClickRef.current = true;
        return;
      }

      if (handlersRef.current.seekingActive()) return;

      const now = Date.now();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const prev = lastTapRef.current;
      const doubleTapMs = handlersRef.current.doubleTapMs ?? 280;
      const doubleTapPx = handlersRef.current.doubleTapPx ?? 36;
      const step = handlersRef.current.seekStep;

      if (
        prev &&
        now - prev.t <= doubleTapMs &&
        Math.hypot(x - prev.x, y - prev.y) <= doubleTapPx
      ) {
        lastTapRef.current = null;
        clearSingleTap();
        suppressClickRef.current = true;
        const third = rect.width / 3;
        if (x < third) {
          handlersRef.current.onHaptic?.("seek");
          handlersRef.current.onSeekBy(-step);
          handlersRef.current.onSeekFlash("left");
        } else if (x > third * 2) {
          handlersRef.current.onHaptic?.("seek");
          handlersRef.current.onSeekBy(step);
          handlersRef.current.onSeekFlash("right");
        } else {
          handlersRef.current.onToggleFullscreen();
        }
        return;
      }

      lastTapRef.current = { t: now, x, y };
      clearSingleTap();
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        handlersRef.current.onSingleTap();
      }, doubleTapMs);
    },
    [clearLongPress, clearSingleTap],
  );

  const onPointerUp = finishPointer;
  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLVideoElement>) => {
      const p = pointerRef.current;
      if (!p || p.id !== e.pointerId) return;
      clearLongPress();
      if (p.mode === "hold-speed") {
        handlersRef.current.onHoldSpeedEnd();
      }
      pointerRef.current = null;
      suppressClickRef.current = true;
    },
    [clearLongPress],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    /** Scale a 0–1 absolute level from a vertical drag ratio (unused helper). */
    levelFromDrag: (start: number, delta: number) => clamp(start + delta, 0, 1),
  };
}
