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

const THUMB_W = 192;
const THUMB_H = 108;
const CAPTURE_INTERVAL = 10; // seconds between captured frames

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
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatVttTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

interface SeekPreview {
  x: number;
  sliderY: number;
  containerW: number;
  time: number;
  img: string | null;
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
}: KittyPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const skipRef = useRef(skipTimes);
  const lastProgressTs = useRef(0);
  const startFiredRef = useRef(false);

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

  const startTimeRef = useRef(startTime);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // ── Thumbnail capture ─────────────────────────────────────────────
  const thumbnailFrames = useRef<Map<number, string>>(new Map());
  const captureCanvas  = useRef<HTMLCanvasElement | null>(null);
  const lastCaptureT   = useRef(-Infinity);
  const blobUrlRef     = useRef<string | null>(null);
  const [generatedThumbsUrl, setGeneratedThumbsUrl] = useState<string | undefined>(undefined);
  const durationRef = useRef(0);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const [seekPreview, setSeekPreview] = useState<SeekPreview | null>(null);

  const captureFrame = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime;
    if (t < 1) return;
    if (t - lastCaptureT.current < CAPTURE_INTERVAL - 0.5) return;

    const roundedT = Math.floor(t / CAPTURE_INTERVAL) * CAPTURE_INTERVAL;
    if (thumbnailFrames.current.has(roundedT)) return;

    const videoEl = containerRef.current?.querySelector("video");
    if (!videoEl || videoEl.readyState < 2) return;

    if (!captureCanvas.current) {
      captureCanvas.current = document.createElement("canvas");
      captureCanvas.current.width  = THUMB_W;
      captureCanvas.current.height = THUMB_H;
    }
    const ctx = captureCanvas.current.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(videoEl, 0, 0, THUMB_W, THUMB_H);
      const dataUrl = captureCanvas.current.toDataURL("image/jpeg", 0.72);
      thumbnailFrames.current.set(roundedT, dataUrl);
      lastCaptureT.current = t;

      // Rebuild VTT blob every few frames to avoid constant re-renders
      if (thumbnailFrames.current.size % 3 === 1 || thumbnailFrames.current.size === 1) {
        const times = Array.from(thumbnailFrames.current.keys()).sort((a, b) => a - b);
        const vttLines = ["WEBVTT", ""];
        for (let i = 0; i < times.length; i++) {
          const start = times[i];
          const end   = times[i + 1] ?? start + CAPTURE_INTERVAL;
          vttLines.push(`${formatVttTime(start)} --> ${formatVttTime(end)}`);
          vttLines.push(thumbnailFrames.current.get(start)!);
          vttLines.push("");
        }
        const blob = new Blob([vttLines.join("\n")], { type: "text/vtt" });
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = URL.createObjectURL(blob);
        setGeneratedThumbsUrl(blobUrlRef.current);
      }
    } catch { /* canvas tainted — stream has strict CORS */ }
  }, []);

  // Clean up blob and frames when source changes
  useEffect(() => {
    thumbnailFrames.current.clear();
    lastCaptureT.current = -Infinity;
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    setGeneratedThumbsUrl(undefined);
    setSeekPreview(null);
  }, [src]);

  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  // ── Seek-bar hover preview ────────────────────────────────────────
  const rafRef = useRef(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const slider = container.querySelector(".vds-time-slider");
        if (!slider) return;

        const sliderRect    = slider.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const inX = e.clientX >= sliderRect.left - 4 && e.clientX <= sliderRect.right + 4;
        const inY = e.clientY >= sliderRect.top - 32 && e.clientY <= sliderRect.bottom + 16;
        if (!inX || !inY) { setSeekPreview(null); return; }

        const pct  = Math.max(0, Math.min(1, (e.clientX - sliderRect.left) / sliderRect.width));
        const time = pct * durationRef.current;
        const key  = Math.floor(time / CAPTURE_INTERVAL) * CAPTURE_INTERVAL;
        const img  = thumbnailFrames.current.get(key) ?? null;

        setSeekPreview({
          x: e.clientX - containerRect.left,
          sliderY: sliderRect.top - containerRect.top,
          containerW: containerRect.width,
          time,
          img,
        });
      });
    };

    const onLeave = () => { cancelAnimationFrame(rafRef.current); setSeekPreview(null); };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const referer = headers?.Referer ?? headers?.referer ?? "";
  const origin  = headers?.Origin  ?? headers?.origin  ?? "";
  const proxiedSrc = src
    ? `/api/kitty/hls?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`
    : "";

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
    ? `/api/kitty/hls?url=${encodeURIComponent(thumbnailTrack.file)}`
    : undefined;

  const m3u8ChaptersUrl =
    !chapterTrack && src
      ? `/api/kitty/chapters?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}`
      : undefined;
  const effectiveChapterUrl = chapterTrack?.file ?? m3u8ChaptersUrl;

  // Vidstack uses stream thumbnails if available, otherwise our generated ones
  const effectiveThumbnails = thumbnailsUrl ?? generatedThumbsUrl;

  // Reset state when src changes
  useEffect(() => {
    startFiredRef.current = false;
    lastProgressTs.current = 0;
    setActiveSkip(null);
    setCurrentTime(0);
    setCountdown(null);
  }, [src]);

  // Re-enter fullscreen when autoFullscreen is requested (next-episode transition)
  useEffect(() => {
    if (!autoFullscreen) return;
    const timer = setTimeout(() => {
      playerRef.current?.enterFullscreen().catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
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

    captureFrame();
  }, [captureFrame]);

  const handleCanPlay = useCallback(() => {
    const t = startTimeRef.current;
    if (t > 10 && playerRef.current) playerRef.current.currentTime = t;
  }, []);

  const handlePlay = useCallback(() => {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
  }, []);

  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
    if (t > 5 && dur > 0) onProgressRef.current?.(t, dur);
  }, []);

  // Episode ended → start countdown if there's a next episode
  const handleEnded = useCallback(() => {
    if (nextEpisode) {
      setCountdown(5);
    }
  }, [nextEpisode]);

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = time;
      player.play();
    }
    setActiveSkip(null);
  }, []);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro" ? skipTimes?.intro : activeSkip === "outro" ? skipTimes?.outro : undefined;

  const nearEnd  = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipOffset = showNext ? "bottom-[8.5rem]" : "bottom-[4.5rem]";

  // Clamp preview x so thumbnail stays inside the container
  const previewX = seekPreview
    ? Math.max(THUMB_W / 2 + 4, Math.min(seekPreview.x, seekPreview.containerW - THUMB_W / 2 - 4))
    : 0;

  return (
    <div ref={containerRef} className="vds-kitty relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <MediaPlayer
        ref={playerRef}
        src={{ src: proxiedSrc, type: "application/x-mpegurl" }}
        poster={poster}
        playsInline
        crossOrigin
        autoPlay
        className="w-full h-full"
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
        <DefaultVideoLayout icons={defaultLayoutIcons} thumbnails={effectiveThumbnails} />

        {/* ── Overlay buttons — inside MediaPlayer so they survive fullscreen ── */}

        {/* Next episode (near end or outro active) */}
        {showNext && nextEpisode && (
          <NextEpisodeButton
            episode={nextEpisode}
            onClick={() => onNextEpisodeRef.current?.()}
          />
        )}

        {/* Skip intro / credits */}
        {activeSkip && activeInterval && countdown === null && (
          <SkipButton
            type={activeSkip}
            interval={activeInterval}
            currentTime={currentTime}
            bottomClass={skipOffset}
            onSkip={() => seekTo(activeInterval.end)}
          />
        )}

        {/* Episode-end countdown overlay */}
        {countdown !== null && nextEpisode && (
          <CountdownOverlay
            episode={nextEpisode}
            countdown={countdown}
            onSkip={() => { setCountdown(null); onNextEpisodeRef.current?.(); }}
            onCancel={() => setCountdown(null)}
          />
        )}
      </MediaPlayer>

      {/* ── Seek bar thumbnail preview (our captured frames) ─────────── */}
      {seekPreview && !thumbnailsUrl && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: previewX,
            top: seekPreview.sliderY - THUMB_H - 44,
            transform: "translateX(-50%)",
          }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/80"
              style={{ width: THUMB_W, height: THUMB_H, outline: "2px solid rgba(255,255,255,0.22)" }}>
              {seekPreview.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seekPreview.img} width={THUMB_W} height={THUMB_H} alt="" className="block" />
              ) : (
                <div className="w-full h-full bg-black/90 flex items-center justify-center">
                  <span className="text-white/20 text-[11px] font-mono">no preview</span>
                </div>
              )}
            </div>
            <div className="bg-black/85 backdrop-blur-sm rounded-md px-2.5 py-0.5">
              <span className="text-white text-[13px] font-mono font-semibold">{formatTime(seekPreview.time)}</span>
            </div>
          </div>
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

  const circumference = 2 * Math.PI * 20; // r=20
  const dashOffset = circumference * (1 - countdown / 5);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/20 bg-black/85 backdrop-blur-md shadow-2xl shadow-black/60 animate-in slide-in-from-right-6 fade-in duration-300">
        {/* Circular countdown ring */}
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

        {/* Text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono text-white/40 leading-none mb-1">Up next</span>
          <span className="text-sm font-semibold text-white leading-tight truncate max-w-[180px]">
            {title}
          </span>
        </div>

        {/* Actions */}
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
