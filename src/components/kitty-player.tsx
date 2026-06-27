"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes, SkipInterval } from "@/query/use-aniskip";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { SkipForward, ChevronRight, X } from "lucide-react";
import { KittyScrubPreview } from "@/components/kitty-scrub-preview";
import {
  THUMB_W,
  THUMB_H,
  SPRITE_COLS,
  MAX_FRAMES,
  buildThumbnailSprites,
  type KittyThumbnail,
} from "@/lib/kitty-thumbnails";
import { buildKittyHlsUrl } from "@/lib/kitty-hls-url";
import { createHlsConfig } from "@/lib/hls-config";
import { isHLSProvider, type MediaProviderAdapter } from "@vidstack/react";
import Hls from "hls.js";

const THUMB_CAPTURE_W = THUMB_W;
const THUMB_CAPTURE_H = THUMB_H;

interface W2gSyncState {
  version: number;
  isPlaying: boolean;
  currentTime: number;
}

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
  startTime?: number;
  autoFullscreen?: boolean;
  nextEpisode?: { id: string; number: number; title: string };
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onNextEpisode?: () => void;
  onOutroStart?: (duration: number) => void;
  onEnded?: () => void;
  w2g?: {
    isHost: boolean;
    syncState?: W2gSyncState | null;
    onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number }) => void;
  };
}

export default function KittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
  startTime = 0,
  autoFullscreen = false,
  nextEpisode,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onOutroStart,
  onEnded: onEndedProp,
  w2g,
}: KittyPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const w2gRef = useRef(w2g);
  const skipRef = useRef(skipTimes);
  const lastProgressTs = useRef(0);
  const startFiredRef = useRef(false);
  const lastW2gReportRef = useRef(0);
  const lastAppliedW2gVersion = useRef(0);
  const applyingW2gRef = useRef(false);

  useEffect(() => { w2gRef.current = w2g; }, [w2g]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const onNextEpisodeRef = useRef(onNextEpisode);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  const onOutroStartRef = useRef(onOutroStart);
  useEffect(() => { onOutroStartRef.current = onOutroStart; }, [onOutroStart]);
  const outroFiredRef = useRef(false);

  const startTimeRef = useRef(startTime);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // Derived early so effects can reference them
  const referer = headers?.Referer ?? headers?.referer ?? "";
  const proxiedSrc = buildKittyHlsUrl(src, headers);

  const subTracks = tracks.filter(
    (t) => !!t.file && t.kind !== "thumbnails" && t.kind !== "chapters" && t.kind !== "metadata",
  );
  const chapterTrack = tracks.find(
    (t) =>
      !!t.file &&
      (t.kind === "chapters" ||
        t.kind === "metadata" ||
        t.label?.toLowerCase().includes("chapter") ||
        t.label?.toLowerCase().includes("skip") ||
        t.label?.toLowerCase().includes("intro")),
  );
  const thumbnailTrack = tracks.find((t) => !!t.file && t.kind === "thumbnails");
  const thumbnailsUrl = thumbnailTrack?.file
    ? buildKittyHlsUrl(thumbnailTrack.file, headers)
    : undefined;
  const m3u8ChaptersUrl =
    !chapterTrack && src
      ? `/api/kitty/chapters?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}`
      : undefined;
  const effectiveChapterUrl = chapterTrack?.file ?? m3u8ChaptersUrl;

  // ── Thumbnail generation (sprite storyboard for scrub previews) ──
  const captureFrames = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgStarted       = useRef(false);
  const [generatedThumbs, setGeneratedThumbs] = useState<KittyThumbnail[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);

  const publishThumbnails = useCallback((interval: number) => {
    if (!spriteCanvasRef.current) {
      spriteCanvasRef.current = document.createElement("canvas");
    }
    const built = buildThumbnailSprites(
      captureFrames.current,
      interval,
      spriteCanvasRef.current,
    );
    if (built.length > 0) setGeneratedThumbs(built);
  }, []);

  // Reset on source change
  useEffect(() => {
    captureFrames.current.clear();
    bgStarted.current = false;
    setGeneratedThumbs([]);
    setThumbsLoading(false);
    startFiredRef.current = false;
    outroFiredRef.current = false;
    lastProgressTs.current = 0;
    setActiveSkip(null);
    setCurrentTime(0);
    setCountdown(null);
  }, [src]);

  // Background: seek hidden HLS video and capture frames into a sprite sheet
  useEffect(() => {
    if (!duration || duration < 10) return;
    if (bgStarted.current) return;
    bgStarted.current = true;
    setThumbsLoading(true);

    const interval = Math.max(8, duration / MAX_FRAMES);
    const timestamps: number[] = [];
    for (let t = 0; t < duration; t += interval) timestamps.push(t);

    let destroyed = false;
    let hlsInst: { destroy: () => void } | null = null;
    const vid = document.createElement("video");
    vid.muted = true;
    vid.preload = "auto";
    vid.crossOrigin = "anonymous";
    vid.playsInline = true;
    vid.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px";

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = THUMB_CAPTURE_W;
    frameCanvas.height = THUMB_CAPTURE_H;

    let idx = 0;
    let captured = 0;

    const captureAndNext = () => {
      const ctx = frameCanvas.getContext("2d");
      if (ctx) {
        try {
          ctx.drawImage(vid, 0, 0, THUMB_CAPTURE_W, THUMB_CAPTURE_H);
          const key = Math.round(vid.currentTime);
          const copy = document.createElement("canvas");
          copy.width = THUMB_CAPTURE_W;
          copy.height = THUMB_CAPTURE_H;
          copy.getContext("2d")?.drawImage(frameCanvas, 0, 0);
          captureFrames.current.set(key, copy);
          captured++;
          if (captured % 4 === 0 || captured === timestamps.length) {
            publishThumbnails(interval);
          }
        } catch {
          /* CORS-tainted canvas */
        }
      }
      if (!destroyed && idx < timestamps.length) {
        vid.currentTime = timestamps[idx++];
      } else if (!destroyed) {
        publishThumbnails(interval);
        setThumbsLoading(false);
      }
    };

    vid.addEventListener("seeked", captureAndNext);

    const startSeeking = () => {
      if (!destroyed && timestamps.length > 0) {
        vid.currentTime = timestamps[idx++];
      }
    };

    import("hls.js").then(({ default: Hls }) => {
      if (destroyed) return;
      if (Hls.isSupported()) {
        const h = new Hls({ maxBufferSize: 0, maxBufferLength: 8, startLevel: 0, debug: false });
        hlsInst = h;
        h.loadSource(proxiedSrc);
        h.attachMedia(vid);
        h.on(Hls.Events.MANIFEST_PARSED, startSeeking);
      } else if (vid.canPlayType("application/vnd.apple.mpegurl")) {
        vid.src = proxiedSrc;
        vid.addEventListener("loadedmetadata", startSeeking, { once: true });
      } else {
        setThumbsLoading(false);
      }
    }).catch(() => setThumbsLoading(false));

    return () => {
      destroyed = true;
      vid.removeEventListener("seeked", captureAndNext);
      hlsInst?.destroy();
      vid.src = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, proxiedSrc, publishThumbnails]);

  const effectiveThumbnails = thumbnailsUrl ?? generatedThumbs;
  const spriteWidth = SPRITE_COLS * THUMB_W;

  // Track that fullscreen should be re-entered when the player is ready
  const autoFsRef = useRef(false);
  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  // Countdown tick → fire next episode at 0
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onNextEpisodeRef.current?.();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Gold intro/outro markers on the vidstack progress bar
  useEffect(() => {
    if (!duration || !skipTimes) return;
    const container = containerRef.current;
    if (!container) return;

    const inject = () => {
      const track = container.querySelector(".vds-slider-track");
      if (!track) return;
      track.querySelectorAll(".kitty-skip-marker").forEach((el) => el.remove());

      const ranges = [
        { interval: skipTimes.intro },
        { interval: skipTimes.outro },
      ].filter((r): r is { interval: NonNullable<typeof r.interval> } => !!r.interval);

      for (const { interval } of ranges) {
        const marker = document.createElement("div");
        marker.className = "kitty-skip-marker";
        marker.style.cssText = `
          position:absolute;top:0;height:100%;pointer-events:none;border-radius:2px;z-index:2;
          left:${(interval.start / duration) * 100}%;
          width:${((interval.end - interval.start) / duration) * 100}%;
          background:rgba(255,196,0,0.65);
        `;
        track.appendChild(marker);
      }
    };

    inject();
    const t = setTimeout(inject, 400);
    return () => {
      clearTimeout(t);
      containerRef.current?.querySelectorAll(".kitty-skip-marker").forEach((el) => el.remove());
    };
  }, [duration, skipTimes]);

  const reportW2g = useCallback((isPlaying: boolean, currentTime: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime });
    lastW2gReportRef.current = currentTime;
  }, []);

  useEffect(() => {
    const cfg = w2gRef.current;
    if (!cfg || cfg.isHost || !cfg.syncState) return;
    const player = playerRef.current;
    if (!player) return;
    const { version, isPlaying, currentTime } = cfg.syncState;
    if (version === lastAppliedW2gVersion.current) return;
    lastAppliedW2gVersion.current = version;
    applyingW2gRef.current = true;

    if (Math.abs(player.currentTime - currentTime) > 2.5) {
      player.currentTime = currentTime;
    }
    if (isPlaying && player.paused) {
      player.play().catch(() => {});
    } else if (!isPlaying && !player.paused) {
      player.pause();
    }

    window.setTimeout(() => {
      applyingW2gRef.current = false;
    }, 600);
  }, [w2g?.syncState]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
    const st  = skipRef.current;

    onLiveTimeRef.current?.(t, dur);
    setCurrentTime(t);
    if (dur > 0) setDuration(dur);

    if (st?.intro && t >= st.intro.start && t < st.intro.end) {
      setActiveSkip("intro");
    } else if (st?.outro && t >= st.outro.start && t < st.outro.end) {
      setActiveSkip("outro");
      if (!outroFiredRef.current && dur > 0) {
        outroFiredRef.current = true;
        onOutroStartRef.current?.(dur);
      }
    } else {
      setActiveSkip((prev) => (prev ? null : prev));
    }

    if (t > 5 && dur > 0) {
      const now = Date.now();
      if (now - lastProgressTs.current >= 10_000) {
        lastProgressTs.current = now;
        onProgressRef.current?.(t, dur);
      }
    }

    const cfg = w2gRef.current;
    if (cfg?.isHost && !applyingW2gRef.current && Math.abs(t - lastW2gReportRef.current) > 2.5) {
      reportW2g(!player.paused, t);
    }
  }, [reportW2g]);

  const handleCanPlay = useCallback(() => {
    const t = startTimeRef.current;
    if (t > 10 && playerRef.current) playerRef.current.currentTime = t;

    // Re-enter fullscreen once the player is ready (binge-watch next-episode transition).
    // The wrapper div in VideoPlayerSection already holds fullscreen; calling
    // enterFullscreen here hands it over to Vidstack so its controls work correctly.
    if (autoFsRef.current) {
      autoFsRef.current = false;
      playerRef.current?.enterFullscreen().catch(() => {
        // Fallback: native fullscreen on the player container element
        containerRef.current?.requestFullscreen().catch(() => {});
      });
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
    const player = playerRef.current;
    if (player) reportW2g(true, player.currentTime);
  }, [reportW2g]);

  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
    if (t > 5 && dur > 0) onProgressRef.current?.(t, dur);
    reportW2g(false, t);
  }, [reportW2g]);

  const onEndedRef = useRef(onEndedProp);
  useEffect(() => { onEndedRef.current = onEndedProp; }, [onEndedProp]);

  const handleEnded = useCallback(() => {
    onEndedRef.current?.();
    if (nextEpisode) setCountdown(5);
  }, [nextEpisode]);

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (player) { player.currentTime = time; player.play(); }
    setActiveSkip(null);
  }, []);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (!provider || !isHLSProvider(provider)) return;
    provider.library = Hls;
    provider.config = {
      ...provider.config,
      ...createHlsConfig(),
    };
  }, []);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro" ? skipTimes?.intro : activeSkip === "outro" ? skipTimes?.outro : undefined;

  const nearEnd  = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipOffset = showNext ? "bottom-[8.5rem]" : "bottom-[4.5rem]";

  return (
    <div
      ref={containerRef}
      className="vds-kitty relative w-full bg-black overflow-hidden"
      data-custom-thumbs={Array.isArray(effectiveThumbnails) && effectiveThumbnails.length > 0 ? "" : undefined}
      style={{ aspectRatio: "16/9" }}
    >
      <MediaPlayer
        ref={playerRef}
        src={{ src: proxiedSrc, type: "application/x-mpegurl" }}
        streamType="on-demand"
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        load="eager"
        autoPlay
        className="w-full h-full"
        onProviderChange={onProviderChange}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
        googleCast={{ receiverApplicationId: "CC1AD845" }}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt="" />}
          {effectiveChapterUrl && (
            <Track src={effectiveChapterUrl} kind="chapters" default />
          )}
          {subTracks.map((track, i) => (
            <Track
              key={track.file}
              src={track.file}
              kind="subtitles"
              label={track.label || `Track ${i + 1}`}
              default={i === 0}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails={
            typeof effectiveThumbnails === "string" ? effectiveThumbnails : undefined
          }
        />

        {showNext && nextEpisode && (
          <NextEpisodeButton episode={nextEpisode} onClick={() => onNextEpisodeRef.current?.()} />
        )}

        {activeSkip && activeInterval && countdown === null && (
          <SkipButton
            type={activeSkip}
            interval={activeInterval}
            currentTime={currentTime}
            bottomClass={skipOffset}
            onSkip={() => seekTo(activeInterval.end)}
          />
        )}

        {countdown !== null && nextEpisode && (
          <CountdownOverlay
            episode={nextEpisode}
            countdown={countdown}
            onSkip={() => { setCountdown(null); onNextEpisodeRef.current?.(); }}
            onCancel={() => setCountdown(null)}
          />
        )}
      </MediaPlayer>

      {Array.isArray(effectiveThumbnails) && effectiveThumbnails.length > 0 && duration > 0 && (
        <KittyScrubPreview
          containerRef={containerRef}
          thumbnails={effectiveThumbnails}
          duration={duration}
          spriteWidth={spriteWidth}
        />
      )}

      {thumbsLoading && (
        <div className="absolute bottom-[3.35rem] left-4 z-[55] pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400" />
          </span>
          <span className="text-[10px] font-mono text-white/50">Loading previews…</span>
        </div>
      )}
    </div>
  );
}

// ── Skip button ───────────────────────────────────────────────────────

function SkipButton({
  type,
  interval,
  currentTime,
  bottomClass = "bottom-[4.5rem]",
  onSkip,
}: {
  type: "intro" | "outro";
  interval: SkipInterval;
  currentTime: number;
  bottomClass?: string;
  onSkip: () => void;
}) {
  const label     = type === "intro" ? "Skip Intro" : "Skip Credits";
  const elapsed   = Math.max(0, currentTime - interval.start);
  const total     = interval.end - interval.start;
  const remaining = Math.max(0, Math.ceil(interval.end - currentTime));
  const progress  = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <button
      onClick={onSkip}
      className={`absolute ${bottomClass} right-4 z-50 group flex flex-col overflow-hidden rounded-xl border border-white/20 bg-black/80 backdrop-blur-md shadow-2xl shadow-black/60 transition-all duration-200 hover:border-white/40 hover:bg-black/90 active:scale-95 animate-in slide-in-from-right-4 fade-in duration-200`}
      style={{ minWidth: 148 }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        <SkipForward className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
        <span className="text-sm font-semibold text-white leading-none">{label}</span>
        <span className="ml-auto text-[11px] font-mono text-white/35 group-hover:text-white/55 transition-colors shrink-0 leading-none">
          {remaining}s
        </span>
      </div>
      <div className="relative h-[3px] w-full bg-white/10">
        <div
          className="absolute left-0 top-0 h-full bg-white/70 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </button>
  );
}

// ── Next episode button ───────────────────────────────────────────────

function NextEpisodeButton({
  episode,
  onClick,
}: {
  episode: { number: number; title: string };
  onClick: () => void;
}) {
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : `Episode ${episode.number}`;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-[4.5rem] right-4 z-50 group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20 bg-black/85 backdrop-blur-md shadow-2xl shadow-black/60 transition-all duration-200 hover:border-white/40 hover:bg-black/95 active:scale-95 animate-in slide-in-from-right-4 fade-in duration-200"
      style={{ maxWidth: 260 }}
    >
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[10px] font-mono text-white/35 group-hover:text-white/55 transition-colors leading-none mb-1">
          Next episode
        </span>
        <span className="text-sm font-semibold text-white leading-tight truncate w-full">
          {title}
        </span>
      </div>
      <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

// ── End-of-episode countdown overlay ─────────────────────────────────

function CountdownOverlay({
  episode,
  countdown,
  onSkip,
  onCancel,
}: {
  episode: { number: number; title: string };
  countdown: number;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : `Episode ${episode.number}`;

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - countdown / 5);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/20 bg-black/85 backdrop-blur-md shadow-2xl shadow-black/60 animate-in slide-in-from-right-6 fade-in duration-300">
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="white" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {countdown}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono text-white/40 leading-none mb-1">Up next</span>
          <span className="text-sm font-semibold text-white leading-tight truncate max-w-[180px]">
            {title}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors"
          >
            Play now <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/8 text-white/50 text-xs font-medium hover:bg-white/14 hover:text-white/80 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
