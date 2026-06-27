"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  isAnime4KSupported,
  startAnime4KUpscaler,
  syncAnime4KCanvasSize,
  type Anime4KMode,
} from "@/lib/anime4k-upscaler";

/** Attach Anime4K WebGPU upscaling from the player video to an overlay canvas. */
export function useAnime4KUpscaler(
  containerRef: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  mode: Anime4KMode,
  videoSrcKey: string,
) {
  const sessionRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    if (!isAnime4KSupported()) return;

    const session = ++sessionRef.current;
    let resizeObserver: ResizeObserver | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const bind = async (video: HTMLVideoElement) => {
      if (session !== sessionRef.current) return;

      resizeObserver = new ResizeObserver(() => {
        syncAnime4KCanvasSize(canvas, container);
      });
      resizeObserver.observe(container);

      try {
        await startAnime4KUpscaler({ video, canvas, container, mode });
      } catch (err) {
        if (session === sessionRef.current) {
          console.error("[Anime4K] failed to start:", err);
        }
      }
    };

    const tryBind = () => {
      const video = container.querySelector("video");
      if (video) {
        if (pollTimer) clearInterval(pollTimer);
        bind(video);
      }
    };

    tryBind();
    if (!container.querySelector("video")) {
      pollTimer = setInterval(tryBind, 250);
    }

    return () => {
      sessionRef.current += 1;
      if (pollTimer) clearInterval(pollTimer);
      resizeObserver?.disconnect();
    };
  }, [enabled, mode, videoSrcKey, containerRef, canvasRef]);
}

export { isAnime4KSupported };
