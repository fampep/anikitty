"use client";

/**
 * Seek-preview thumbnails for sources that ship no storyboard VTT.
 *
 * Providers like ReAnime/FlixCloud hand back a `thumbnails` WebVTT and we just
 * crop their sprite sheet (see `use-storyboard-cues`). Everyone else gives us
 * nothing, so we grow our own: a hidden, muted video decodes the same stream at
 * its lowest rendition, seeks to the hovered position, and we paint the frame
 * into a canvas.
 *
 * Latency is the whole game here — a preview that lands after you've moved on
 * is worthless — so the pipeline is tuned for time-to-first-pixel:
 *   - hls.js is warmed (manifest only, no segments) the moment previews are
 *     enabled, so the first hover doesn't pay for a cold start
 *   - the nearest already-captured frame paints immediately while the exact
 *     one decodes, so the popup is never empty once anything is cached
 *   - frames become object URLs via `toBlob`, off the main thread, instead of
 *     synchronous base64
 *   - after each capture the next bucket in the scrub direction is prefetched
 *
 * Bandwidth is still respected: lowest rendition only, one decode in flight,
 * hover quantised into buckets, and the whole rig tears down once you stop.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";

import { isHlsStreamUrl } from "@/lib/kitty/stream-format";
import type { StoryboardCue } from "@/lib/player/storyboard-vtt";

/** Seconds per cached frame. Coarse enough to stay cheap, fine enough to read. */
const BUCKET_SECS = 10;
/** Frames kept in memory (~140 covers a 24-minute episode end to end). */
const CACHE_LIMIT = 160;
/**
 * Coalescing window only — a hover with nothing in flight decodes immediately.
 * Just long enough to skip the buckets a fast swipe crosses on its way past.
 */
const HOVER_COALESCE_MS = 35;
/**
 * Give up on a bucket if the seek never lands (dead segment, 403, etc).
 * Generous on purpose: a cold segment through the double-hop proxy regularly
 * needs 2-3s, and abandoning it at 2.5s threw away frames that were about to
 * arrive — the nearest-frame stand-in already covers the wait visually.
 */
const SEEK_TIMEOUT_MS = 6000;
/** Tear the shadow video down after this long without a hover. */
const IDLE_TEARDOWN_MS = 25_000;
/** Furthest a stand-in frame may sit from the hovered time before it misleads. */
const NEAREST_FALLBACK_SECS = 75;
/** Matches SEEK_PREVIEW_MAX_W in chrome.tsx. */
const FRAME_W = 168;

function bucketFor(time: number): number {
  return Math.max(0, Math.floor(time / BUCKET_SECS) * BUCKET_SECS);
}

function toCue(bucket: number, url: string): StoryboardCue {
  return {
    start: bucket,
    end: bucket + BUCKET_SECS,
    src: url,
    x: null,
    y: null,
    w: null,
    h: null,
  };
}

/**
 * Returns a full-image `StoryboardCue` for the hovered time. Shaped like a
 * storyboard cue on purpose so `SeekPreviewCard` renders it without knowing
 * where the image came from.
 */
export function useScrubFramePreviews({
  src,
  enabled,
  hoverTime,
  duration,
}: {
  src: string | null | undefined;
  enabled: boolean;
  hoverTime: number | null;
  duration: number;
}): StoryboardCue | null {
  const [cue, setCue] = useState<StoryboardCue | null>(null);

  const cacheRef = useRef(new Map<number, string>());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadingRef = useRef(false);
  const busyRef = useRef(false);
  const pendingRef = useRef<number | null>(null);
  const lastBucketRef = useRef<number | null>(null);
  const directionRef = useRef(1);
  const durationRef = useRef(duration);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coalesceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  durationRef.current = duration;

  const releaseCache = useCallback(() => {
    for (const url of cacheRef.current.values()) URL.revokeObjectURL(url);
    cacheRef.current.clear();
  }, []);

  const teardown = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* detaching a half-loaded element can throw; nothing to salvage */
      }
      video.remove();
    }
    videoRef.current = null;
    loadingRef.current = false;
    busyRef.current = false;
    pendingRef.current = null;
  }, []);

  /**
   * Build the shadow element. Called as soon as previews are enabled so the
   * manifest is parsed before the first hover; segment loading stays parked
   * until a capture actually asks for one.
   */
  const ensureVideo = useCallback((): HTMLVideoElement | null => {
    if (videoRef.current) return videoRef.current;
    if (!src) return null;

    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    // Never let the shadow element make noise or grab the Media Session.
    video.volume = 0;
    video.setAttribute("aria-hidden", "true");
    video.tabIndex = -1;
    // Parked off-screen rather than detached: a detached element backed by MSE
    // is not reliably decoded, and `display:none` can suspend the decoder.
    video.style.cssText =
      "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);
    videoRef.current = video;

    if (isHlsStreamUrl(src) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Just enough to decode one frame — we are not playing this back.
        backBufferLength: 0,
        maxBufferLength: 4,
        maxMaxBufferLength: 6,
        maxBufferSize: 2 * 1000 * 1000,
        startLevel: 0,
        capLevelToPlayerSize: false,
        startFragPrefetch: false,
        // Fail fast: a stalled preview segment should never queue behind retries.
        fragLoadingMaxRetry: 1,
        manifestLoadingMaxRetry: 1,
      });
      hls.subtitleDisplay = false;
      hls.subtitleTrack = -1;
      hls.attachMedia(video);
      hls.loadSource(src);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Pin the genuinely smallest rendition — a 168px-wide thumbnail cannot
        // tell 1080p apart, and segment size is what the seek latency is made
        // of. Index 0 is usually lowest but ladders are not always sorted, so
        // pick by pixel count rather than trusting the order.
        const levels = hls.levels ?? [];
        let smallest = 0;
        for (let i = 1; i < levels.length; i += 1) {
          const a = (levels[i]?.width ?? 0) * (levels[i]?.height ?? 0);
          const b = (levels[smallest]?.width ?? 0) * (levels[smallest]?.height ?? 0);
          const cheaper =
            a > 0 && b > 0
              ? a < b
              : (levels[i]?.bitrate ?? Infinity) < (levels[smallest]?.bitrate ?? Infinity);
          if (cheaper) smallest = i;
        }
        hls.autoLevelCapping = smallest;
        hls.currentLevel = smallest;
        hls.loadLevel = smallest;
        hls.nextLevel = smallest;
        // Warm-up ends here. Park segment loading until a hover needs a frame,
        // so merely opening a watch page costs one manifest and nothing more.
        if (!loadingRef.current) hls.stopLoad();
      });
      hlsRef.current = hls;
    } else {
      video.src = src;
    }

    return video;
  }, [src]);

  /** Resume segment loading (no-op for progressive MP4). */
  const startLoading = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    hlsRef.current?.startLoad();
  }, []);

  const capture = useCallback(
    (bucket: number, isPrefetch = false) => {
      const video = ensureVideo();
      if (!video) return;
      if (cacheRef.current.has(bucket)) return;
      startLoading();

      busyRef.current = true;
      let settled = false;

      const cleanup = () => {
        video.removeEventListener("seeked", onSeeked);
        clearTimeout(timer);
      };

      const finish = () => {
        cleanup();
        busyRef.current = false;
        // Latest hover wins — drain whatever queued while we were decoding.
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next != null && !cacheRef.current.has(next)) {
          capture(next);
          return;
        }
        // Idle: pull the next bucket in the scrub direction forward so the
        // very next hover is a cache hit rather than another round trip.
        if (!isPrefetch && lastBucketRef.current != null) {
          const ahead = lastBucketRef.current + directionRef.current * BUCKET_SECS;
          const max = Math.max(0, durationRef.current - 1);
          if (ahead >= 0 && ahead <= max && !cacheRef.current.has(ahead)) {
            capture(ahead, true);
          }
        }
      };

      const store = (url: string) => {
        const cache = cacheRef.current;
        cache.set(bucket, url);
        if (cache.size > CACHE_LIMIT) {
          // Map preserves insertion order, so the first key is the oldest.
          const oldest = cache.keys().next().value;
          if (oldest != null) {
            const stale = cache.get(oldest);
            if (stale) URL.revokeObjectURL(stale);
            cache.delete(oldest);
          }
        }
        // Only promote to the visible cue if the pointer still wants this
        // bucket — a prefetch must never yank the frame out from under it.
        if (lastBucketRef.current === bucket) setCue(toCue(bucket, url));
      };

      const onSeeked = () => {
        if (settled) return;
        settled = true;
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          finish();
          return;
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = FRAME_W;
          canvas.height = Math.max(
            1,
            Math.round((FRAME_W * video.videoHeight) / video.videoWidth),
          );
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            finish();
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // toBlob hands the encode off the main thread; an object URL also
          // spares the <img> a base64 decode on every repaint.
          canvas.toBlob(
            (blob) => {
              if (blob) store(URL.createObjectURL(blob));
              finish();
            },
            "image/jpeg",
            0.7,
          );
          return;
        } catch {
          // Tainted canvas or a decode that vanished mid-draw — no frame, no fuss.
        }
        finish();
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        finish();
      }, SEEK_TIMEOUT_MS);

      video.addEventListener("seeked", onSeeked);
      try {
        // fastSeek lands on the nearest keyframe instead of decoding forward to
        // an exact frame — plenty for a thumbnail, and much quicker where it exists.
        if (typeof video.fastSeek === "function") video.fastSeek(bucket);
        else video.currentTime = bucket;
      } catch {
        settled = true;
        finish();
      }
    },
    [ensureVideo, startLoading],
  );

  /** Closest captured frame to `bucket`, so the popup is never empty. */
  const nearestCached = useCallback((bucket: number): StoryboardCue | null => {
    let bestKey: number | null = null;
    let bestGap = Infinity;
    for (const key of cacheRef.current.keys()) {
      const gap = Math.abs(key - bucket);
      if (gap < bestGap) {
        bestGap = gap;
        bestKey = key;
      }
    }
    if (bestKey == null || bestGap > NEAREST_FALLBACK_SECS) return null;
    const url = cacheRef.current.get(bestKey);
    return url ? toCue(bestKey, url) : null;
  }, []);

  // A new source invalidates every cached frame.
  useEffect(() => {
    releaseCache();
    setCue(null);
    lastBucketRef.current = null;
    teardown();
  }, [src, releaseCache, teardown]);

  useEffect(
    () => () => {
      teardown();
      releaseCache();
    },
    [teardown, releaseCache],
  );

  // Warm hls.js (manifest only) the moment previews become possible, so the
  // first hover is a seek rather than a full cold start.
  useEffect(() => {
    if (!enabled || !src) return;
    ensureVideo();
  }, [enabled, src, ensureVideo]);

  useEffect(() => {
    if (coalesceRef.current) {
      clearTimeout(coalesceRef.current);
      coalesceRef.current = null;
    }

    if (!enabled || !src || hoverTime == null || !(duration > 0)) {
      lastBucketRef.current = null;
      setCue(null);
      return;
    }

    const bucket = Math.min(bucketFor(hoverTime), Math.max(0, duration - 1));
    const prev = lastBucketRef.current;
    if (prev != null && bucket !== prev) directionRef.current = bucket > prev ? 1 : -1;
    lastBucketRef.current = bucket;

    // Keep the shadow element alive while the user is actively scrubbing.
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(teardown, IDLE_TEARDOWN_MS);

    const cached = cacheRef.current.get(bucket);
    if (cached) {
      setCue(toCue(bucket, cached));
      return;
    }

    // Paint the closest frame we already hold rather than dropping to the bare
    // time bubble; the exact frame swaps in when it lands.
    setCue(nearestCached(bucket));

    if (document.hidden) return;
    if (busyRef.current) {
      pendingRef.current = bucket;
      return;
    }

    coalesceRef.current = setTimeout(() => {
      coalesceRef.current = null;
      if (busyRef.current) {
        pendingRef.current = bucket;
        return;
      }
      capture(bucket);
    }, HOVER_COALESCE_MS);

    return () => {
      if (coalesceRef.current) {
        clearTimeout(coalesceRef.current);
        coalesceRef.current = null;
      }
    };
  }, [enabled, src, hoverTime, duration, capture, teardown, nearestCached]);

  return cue;
}
