"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { clamp } from "./utils";

const VERTICAL_LOCK_PX = 12;
const HORIZONTAL_ABORT_PX = 18;
const LONG_PRESS_HOLD_MS = 380;

export type SurfaceGestureHandlers = {
  onSeekFlash: (side: "left" | "right") => void;
  onSeekBy: (delta: number) => void;
  onToggleFullscreen: () => void;
  onSingleTap: () => void;
  onVolumeDelta: (delta: number) => void;
  onBrightnessDelta: (delta: number) => void;
  onHoldSpeedStart: () => void;
  onHoldSpeedEnd: () => void;
  seekingActive: () => boolean;
  seekStep: number;
  doubleTapMs?: number;
  doubleTapPx?: number;
};

type GestureMode = "none" | "volume" | "brightness" | "hold-speed";

/**
 * Mobile surface gestures: double-tap seek / FS, vertical volume (right) /
 * brightness (left), and hold-to-2× while playing.
 */
export function useSurfaceGestures(handlers: SurfaceGestureHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastY: number;
    zone: "left" | "right" | "center";
    mode: GestureMode;
    moved: boolean;
    longPressTimer: ReturnType<typeof setTimeout> | null;
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
        lastY: y,
        zone,
        mode: "none",
        moved: false,
        longPressTimer: setTimeout(() => {
          const p = pointerRef.current;
          if (!p || p.mode !== "none" || p.moved) return;
          p.mode = "hold-speed";
          suppressClickRef.current = true;
          handlersRef.current.onHoldSpeedStart();
        }, LONG_PRESS_HOLD_MS),
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

      if (p.mode === "hold-speed") {
        // Slight movement is fine while holding speed.
        return;
      }

      if (p.mode === "none") {
        if (Math.abs(dx) > HORIZONTAL_ABORT_PX && Math.abs(dx) > Math.abs(dy)) {
          clearLongPress();
          pointerRef.current = null;
          return;
        }
        if (Math.abs(dy) < VERTICAL_LOCK_PX) return;
        if (Math.abs(dy) <= Math.abs(dx)) return;

        clearLongPress();
        p.moved = true;
        p.mode = p.zone === "left" ? "brightness" : "volume";
        suppressClickRef.current = true;
        lastTapRef.current = null;
        clearSingleTap();
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
      pointerRef.current = null;

      if (mode === "hold-speed") {
        handlersRef.current.onHoldSpeedEnd();
        suppressClickRef.current = true;
        return;
      }

      if (mode === "volume" || mode === "brightness") {
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
          handlersRef.current.onSeekBy(-step);
          handlersRef.current.onSeekFlash("left");
        } else if (x > third * 2) {
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
