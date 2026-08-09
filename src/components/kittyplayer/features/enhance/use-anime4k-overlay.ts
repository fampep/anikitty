"use client";

/**
 * Anime4K WebGPU upscale overlay.
 *
 * Owns the whole lifecycle of the attachment: it must detach its
 * requestVideoFrameCallback loop on cleanup, and it re-attaches whenever the
 * source, mode, or cast state changes. Player-only — never runs while casting,
 * in lite mode, or without WebGPU.
 */

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  attachAnime4k,
  isWebGpuSupported,
  type Anime4kMode,
} from "@/lib/player/anime4k";

export function useAnime4kOverlay({
  videoRef,
  rootRef,
  enabled,
  mode,
  liteMode,
  casting,
  castConnecting,
  src,
  attachNonce,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  mode: Anime4kMode;
  liteMode: boolean;
  casting: boolean;
  castConnecting: boolean;
  src: string;
  attachNonce: number;
}): boolean {
  const [active, setActive] = useState(false);
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const layer =
      rootRef.current?.querySelector<HTMLElement>("[data-ak-video-layer]") ?? null;
    const effective =
      enabled && !liteMode && !casting && !castConnecting && isWebGpuSupported();
    let cancelled = false;

    detachRef.current?.();
    detachRef.current = null;
    setActive(false);

    if (!effective || !video || !layer) return;

    void attachAnime4k({ video, videoContainer: layer, mode })
      .then((attachment) => {
        if (cancelled) {
          attachment.detach();
          return;
        }
        detachRef.current = attachment.detach;
        setActive(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[anime4k] attach failed:", err);
        setActive(false);
      });

    return () => {
      cancelled = true;
      detachRef.current?.();
      detachRef.current = null;
      setActive(false);
    };
    // videoRef/rootRef are stable refs; the rest is the real re-attach trigger.
  }, [videoRef, rootRef, enabled, mode, liteMode, casting, castConnecting, src, attachNonce]);

  return active;
}
