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
import { SkipForward } from "lucide-react";

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
  startTime?: number;
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
}

export default function KittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
  startTime = 0,
  onStart,
  onProgress,
}: KittyPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const skipRef = useRef(skipTimes);
  const lastProgressTs = useRef(0);
  const startFiredRef = useRef(false);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const startTimeRef = useRef(startTime);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  const referer = headers?.Referer ?? headers?.referer ?? "";
  const origin = headers?.Origin ?? headers?.origin ?? "";
  const proxiedSrc = src
    ? `/api/kitty/hls?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`
    : "";

  const subTracks = tracks.filter(
    (t) => !!t.file && t.kind !== "thumbnails" && t.kind !== "chapters" && t.kind !== "metadata",
  );
  // Pass the chapters track to vidstack so it renders segment markers on the progress bar
  const chapterTrack = tracks.find(
    (t) =>
      !!t.file &&
      (t.kind === "chapters" ||
        t.kind === "metadata" ||
        t.label?.toLowerCase().includes("chapter") ||
        t.label?.toLowerCase().includes("skip") ||
        t.label?.toLowerCase().includes("intro")),
  );

  useEffect(() => {
    startFiredRef.current = false;
    lastProgressTs.current = 0;
    setActiveSkip(null);
    setCurrentTime(0);
  }, [src]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime;
    const dur = player.duration;
    const st = skipRef.current;

    setCurrentTime(t);

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
  }, []);

  const handleCanPlay = useCallback(() => {
    const t = startTimeRef.current;
    if (t > 10 && playerRef.current) {
      playerRef.current.currentTime = t;
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
  }, []);

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

  return (
    <div className="vds-kitty relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
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
        googleCast={{ receiverApplicationId: "CC1AD845" }}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt="" />}
          {/* Chapters track — makes vidstack show intro/outro markers on the progress bar */}
          {chapterTrack && (
            <Track
              src={chapterTrack.file}
              kind="chapters"
              default
            />
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
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {/* Skip button */}
      {activeSkip && activeInterval && (
        <SkipButton
          type={activeSkip}
          interval={activeInterval}
          currentTime={currentTime}
          onSkip={() => seekTo(activeInterval.end)}
        />
      )}
    </div>
  );
}

function SkipButton({
  type,
  interval,
  currentTime,
  onSkip,
}: {
  type: "intro" | "outro";
  interval: SkipInterval;
  currentTime: number;
  onSkip: () => void;
}) {
  const label = type === "intro" ? "Skip Intro" : "Skip Credits";
  const elapsed = Math.max(0, currentTime - interval.start);
  const total = interval.end - interval.start;
  const remaining = Math.max(0, Math.ceil(interval.end - currentTime));
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <button
      onClick={onSkip}
      className="absolute bottom-[4.5rem] right-4 z-20 group flex flex-col overflow-hidden rounded-xl border border-white/20 bg-black/80 backdrop-blur-md shadow-2xl shadow-black/60 transition-all duration-200 hover:border-white/40 hover:bg-black/90 active:scale-95 animate-in slide-in-from-right-4 fade-in duration-200"
      style={{ minWidth: 148 }}
    >
      {/* Main label row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <SkipForward className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors shrink-0" />
        <span className="text-sm font-semibold text-white leading-none">{label}</span>
        <span className="ml-auto text-[11px] font-mono text-white/35 group-hover:text-white/55 transition-colors shrink-0 leading-none">
          {remaining}s
        </span>
      </div>

      {/* Progress bar fill */}
      <div className="relative h-[3px] w-full bg-white/10">
        <div
          className="absolute left-0 top-0 h-full bg-white/70 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </button>
  );
}
