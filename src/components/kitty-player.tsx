"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes } from "@/query/use-aniskip";
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

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
}

export default function KittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
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

  const referer = headers?.Referer ?? headers?.referer ?? "";
  const origin = headers?.Origin ?? headers?.origin ?? "";
  const proxiedSrc = src
    ? `/api/kitty/hls?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`
    : "";

  const subTracks = tracks.filter(
    (t) => !!t.file && t.kind !== "thumbnails" && t.kind !== "chapters",
  );

  useEffect(() => {
    startFiredRef.current = false;
    lastProgressTs.current = 0;
    setActiveSkip(null);
  }, [src]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime;
    const dur = player.duration;
    const st = skipRef.current;

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
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        googleCast={{ receiverApplicationId: "CC1AD845" }}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt="" />}
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

      {activeSkip === "intro" && skipTimes?.intro && (
        <button
          onClick={() => seekTo(skipTimes.intro!.end)}
          className="absolute bottom-16 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/85 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/10 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
        >
          <span>⏭</span> Skip Intro
        </button>
      )}

      {activeSkip === "outro" && skipTimes?.outro && (
        <button
          onClick={() => seekTo(skipTimes.outro!.end)}
          className="absolute bottom-16 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/85 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/10 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
        >
          <span>⏭</span> Skip Credits
        </button>
      )}
    </div>
  );
}
