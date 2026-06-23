"use client";

import { useEffect, useRef, useState } from "react";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes } from "@/query/use-aniskip";

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
  const onStartRef    = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  useEffect(() => { onStartRef.current    = onStart;    }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);

  const containerRef   = useRef<HTMLDivElement>(null);
  const artRef         = useRef<any>(null);
  const skipRef        = useRef<SkipTimes | undefined>(skipTimes);
  const lastProgressTs = useRef(0);
  const startFiredRef  = useRef(false);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);

  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  useEffect(() => {
    if (!containerRef.current || !src) return;
    let cancelled = false;
    startFiredRef.current = false;
    setActiveSkip(null);

    (async () => {
      const [{ default: Artplayer }, { default: Hls }] = await Promise.all([
        import("artplayer"),
        import("hls.js"),
      ]);
      if (cancelled || !containerRef.current) return;

      if (artRef.current) {
        try { artRef.current.destroy(true); } catch {}
        artRef.current = null;
      }

      const referer = headers?.Referer ?? headers?.referer ?? "";
      const origin  = headers?.Origin  ?? headers?.origin  ?? "";
      const proxiedSrc = `/api/kitty/hls?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;

      const validTracks = (tracks ?? []).filter((t) => !!t.file);

      const artOptions: any = {
        container: containerRef.current!,
        url: proxiedSrc,
        type: "m3u8",
        poster,
        autoplay: true,
        volume: 1,
        pip: true,
        setting: true,
        playbackRate: true,
        fullscreen: true,
        playsInline: true,
        hotkey: true,
        theme: "#fff",
        lang: "en",
        customType: {
          m3u8: (video: HTMLVideoElement, url: string, artInstance: any) => {
            if (Hls.isSupported()) {
              if (artInstance.hls) artInstance.hls.destroy();
              const hls = new Hls({ enableWorker: false });
              hls.loadSource(url);
              hls.attachMedia(video);
              artInstance.hls = hls;
              artInstance.on("destroy", () => hls.destroy());
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url;
            }
          },
        },
      };

      if (validTracks[0]) {
        artOptions.subtitle = {
          url: validTracks[0].file,
          type: "vtt",
          style: {
            color: "#fff",
            fontSize: "20px",
            textShadow: "0 1px 6px rgba(0,0,0,0.95)",
          },
          encoding: "utf-8",
        };
      }

      const art = new Artplayer(artOptions);

      art.on("play", () => {
        if (!startFiredRef.current) {
          startFiredRef.current = true;
          onStartRef.current?.();
        }
      });

      art.on("timeupdate", () => {
        const t   = art.currentTime;
        const dur = art.duration;
        const st  = skipRef.current;

        if (st?.intro && t >= st.intro.start && t < st.intro.end) {
          setActiveSkip("intro");
        } else if (st?.outro && t >= st.outro.start && t < st.outro.end) {
          setActiveSkip("outro");
        } else {
          setActiveSkip(null);
        }

        if (t > 5 && dur > 0) {
          const now = Date.now();
          if (now - lastProgressTs.current >= 10_000) {
            lastProgressTs.current = now;
            onProgressRef.current?.(t, dur);
          }
        }
      });

      artRef.current = art;
    })();

    return () => {
      cancelled = true;
      if (artRef.current) {
        try { artRef.current.destroy(true); } catch {}
        artRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const seekTo = (time: number) => {
    if (artRef.current) {
      artRef.current.seek = time;
      artRef.current.play();
    }
    setActiveSkip(null);
  };

  return (
    <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
      <div ref={containerRef} className="w-full h-full" />

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
