"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes } from "@/query/use-aniskip";

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
}

export default function KittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
}: KittyPlayerProps) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const playerRef  = useRef<any>(null);
  const skipRef    = useRef<SkipTimes | undefined>(skipTimes);
  const markersRef = useRef<HTMLDivElement[]>([]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);

  // Keep skip ref fresh without re-initialising the player
  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  // Add / refresh progress-bar markers whenever skip times or duration change
  const paintMarkers = useCallback((player: any) => {
    const dur = player.duration?.() ?? 0;
    if (!dur) return;
    const holder = player.el()?.querySelector(".vjs-progress-holder") as HTMLElement | null;
    if (!holder) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarker = (time: number, color: string) => {
      const pct = Math.min(100, Math.max(0, (time / dur) * 100));
      const el = document.createElement("div");
      el.style.cssText = `
        position:absolute; top:-3px; left:${pct}%;
        width:3px; height:calc(100% + 6px);
        background:${color}; border-radius:2px;
        z-index:2; pointer-events:none;
      `;
      holder.appendChild(el);
      markersRef.current.push(el);
    };

    if (skipRef.current?.intro) {
      addMarker(skipRef.current.intro.start, "#22c55e");
      addMarker(skipRef.current.intro.end,   "#22c55e");
    }
    if (skipRef.current?.outro) {
      addMarker(skipRef.current.outro.start, "#f97316");
      addMarker(skipRef.current.outro.end,   "#f97316");
    }
  }, []);

  useEffect(() => {
    if (!wrapRef.current || !src) return;
    let cancelled = false;

    (async () => {
      const videojs = (await import("video.js")).default;
      if (cancelled || !wrapRef.current) return;

      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      wrapRef.current.innerHTML = "";

      const videoEl = document.createElement("video-js");
      videoEl.setAttribute("playsinline", "true");
      wrapRef.current.appendChild(videoEl);

      const validTracks = (tracks ?? []).filter((t) => !!t.file);
      const referer = headers?.Referer ?? headers?.referer ?? "";
      const origin  = headers?.Origin  ?? headers?.origin  ?? "";

      const proxiedSrc = src
        ? `/api/kitty/hls?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`
        : src;

      const player = videojs(videoEl, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        poster,
        preload: "auto",
        html5: {
          vhs: {
            overrideNative: !(videojs as any).browser?.IS_SAFARI,
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [{ src: proxiedSrc, type: "application/x-mpegURL" }],
        tracks: validTracks.map((t, i) => ({
          src: t.file,
          kind: (t.kind ?? "subtitles") as TextTrackKind,
          label: t.label ?? `Track ${i + 1}`,
          srclang: "en",
          default: i === 0,
        })),
      });

      // Paint markers once duration is known
      player.one("loadedmetadata", () => paintMarkers(player));
      // Also repaint when skip times change (see separate useEffect below)
      player.on("durationchange", () => paintMarkers(player));

      // Show / hide skip buttons
      player.on("timeupdate", () => {
        const t = player.currentTime() ?? 0;
        const st = skipRef.current;
        if (st?.intro && t >= st.intro.start && t < st.intro.end) {
          setActiveSkip("intro");
        } else if (st?.outro && t >= st.outro.start && t < st.outro.end) {
          setActiveSkip("outro");
        } else {
          setActiveSkip(null);
        }
      });

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      markersRef.current = [];
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Repaint markers whenever skipTimes prop changes (loaded after player init)
  useEffect(() => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      paintMarkers(playerRef.current);
    }
  }, [skipTimes, paintMarkers]);

  const seekTo = (time: number) => {
    playerRef.current?.currentTime(time);
    setActiveSkip(null);
  };

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      {/* Video.js mount point */}
      <div
        ref={wrapRef}
        className="w-full h-full
          [&_.video-js]:w-full [&_.video-js]:h-full [&_.video-js]:max-w-none
          [&_.vjs-big-play-button]:border-green-500
          [&_.vjs-big-play-button]:bg-green-900/80
          [&_.vjs-big-play-button:hover]:bg-green-700
          [&_.vjs-play-progress]:bg-green-500
          [&_.vjs-play-progress:before]:text-green-400
          [&_.vjs-volume-level]:bg-green-500
          [&_.vjs-load-progress]:bg-green-800/40
          [&_.vjs-control-bar]:bg-gradient-to-t [&_.vjs-control-bar]:from-black/90 [&_.vjs-control-bar]:to-transparent
          [&_.vjs-slider]:bg-green-900/50
          [&_.vjs-menu-button-popup_.vjs-menu]:bg-[#020f04]/95
          [&_.vjs-menu-button-popup_.vjs-menu]:border [&_.vjs-menu-button-popup_.vjs-menu]:border-green-900/60"
      />

      {/* Skip Intro button */}
      {activeSkip === "intro" && skipTimes?.intro && (
        <button
          onClick={() => seekTo(skipTimes.intro!.end)}
          className="absolute bottom-16 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/85 border border-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-900/70 active:scale-95 transition-all shadow-lg shadow-black/50 backdrop-blur-sm"
        >
          <span className="text-green-400 text-base">⏭</span>
          Skip Intro
        </button>
      )}

      {/* Skip Credits button */}
      {activeSkip === "outro" && skipTimes?.outro && (
        <button
          onClick={() => seekTo(skipTimes.outro!.end)}
          className="absolute bottom-16 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black/85 border border-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-900/70 active:scale-95 transition-all shadow-lg shadow-black/50 backdrop-blur-sm"
        >
          <span className="text-orange-400 text-base">⏭</span>
          Skip Credits
        </button>
      )}

      {/* Marker legend — only shown when skip times are available */}
      {(skipTimes?.intro || skipTimes?.outro) && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-3 px-2 py-1 bg-black/60 rounded text-[10px] font-mono backdrop-blur-sm pointer-events-none">
          {skipTimes.intro && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-green-400">Intro</span>
            </span>
          )}
          {skipTimes.outro && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              <span className="text-orange-400">Credits</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
