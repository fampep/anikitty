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
import { SkipForward, ChevronRight } from "lucide-react";

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
  startTime?: number;
  nextEpisode?: { id: string; number: number; title: string };
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onNextEpisode?: () => void;
}

export default function KittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
  startTime = 0,
  nextEpisode,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
}: KittyPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);
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
  const onNextEpisodeRef = useRef(onNextEpisode);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);

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
  const chapterTrack = tracks.find(
    (t) =>
      !!t.file &&
      (t.kind === "chapters" ||
        t.kind === "metadata" ||
        t.label?.toLowerCase().includes("chapter") ||
        t.label?.toLowerCase().includes("skip") ||
        t.label?.toLowerCase().includes("intro")),
  );
  // Thumbnails VTT → sprite sheet for progress-bar hover preview
  const thumbnailTrack = tracks.find((t) => !!t.file && t.kind === "thumbnails");
  const thumbnailsUrl = thumbnailTrack?.file
    ? `/api/kitty/hls?url=${encodeURIComponent(thumbnailTrack.file)}`
    : undefined;

  // If no chapter track came from the stream, derive one from the m3u8 on the server
  const m3u8ChaptersUrl =
    !chapterTrack && src
      ? `/api/kitty/chapters?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}`
      : undefined;
  const effectiveChapterUrl = chapterTrack?.file ?? m3u8ChaptersUrl;

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

    // Always fire live time so parent can track current position
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

  // Save progress immediately on pause
  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime;
    const dur = player.duration;
    if (t > 5 && dur > 0) {
      onProgressRef.current?.(t, dur);
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

  // Show next episode button when within 90s of end, or outro is active and there's a next episode
  const nearEnd = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro");
  // Stack next-episode above skip button when both are visible
  const skipOffset = showNext ? "bottom-[8.5rem]" : "bottom-[4.5rem]";

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
        onPause={handlePause}
        googleCast={{ receiverApplicationId: "CC1AD845" }}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt="" />}
          {/* Chapters track — from stream or derived from the m3u8 manifest */}
          {effectiveChapterUrl && (
            <Track
              src={effectiveChapterUrl}
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
        <DefaultVideoLayout icons={defaultLayoutIcons} thumbnails={thumbnailsUrl} />
      </MediaPlayer>

      {/* Next episode button */}
      {showNext && nextEpisode && (
        <NextEpisodeButton
          episode={nextEpisode}
          onClick={() => onNextEpisodeRef.current?.()}
        />
      )}

      {/* Skip intro / credits button */}
      {activeSkip && activeInterval && (
        <SkipButton
          type={activeSkip}
          interval={activeInterval}
          currentTime={currentTime}
          bottomClass={skipOffset}
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
  bottomClass = "bottom-[4.5rem]",
  onSkip,
}: {
  type: "intro" | "outro";
  interval: SkipInterval;
  currentTime: number;
  bottomClass?: string;
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
      className={`absolute ${bottomClass} right-4 z-20 group flex flex-col overflow-hidden rounded-xl border border-white/20 bg-black/80 backdrop-blur-md shadow-2xl shadow-black/60 transition-all duration-200 hover:border-white/40 hover:bg-black/90 active:scale-95 animate-in slide-in-from-right-4 fade-in duration-200`}
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

function NextEpisodeButton({
  episode,
  onClick,
}: {
  episode: { number: number; title: string };
  onClick: () => void;
}) {
  const title = episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
    ? episode.title
    : `Episode ${episode.number}`;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-[4.5rem] right-4 z-20 group flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20 bg-black/85 backdrop-blur-md shadow-2xl shadow-black/60 transition-all duration-200 hover:border-white/40 hover:bg-black/95 active:scale-95 animate-in slide-in-from-right-4 fade-in duration-200"
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
