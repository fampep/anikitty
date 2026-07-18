"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useGetAnimeThemes } from "@/query/anime/get-anime-themes";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type AnimeThemePlayerProps = {
  anilistId: number;
  className?: string;
};

const UNMUTE_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"] as const;

export default function AnimeThemePlayer({ anilistId, className }: AnimeThemePlayerProps) {
  const t = useT();
  const playThemeSong = useSettingsStore((s) => s.playThemeSong);
  const { data: themes, isLoading } = useGetAnimeThemes(anilistId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const unmutedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  const playback = themes?.playback;

  const applyUnmuted = useCallback(() => {
    const video = videoRef.current;
    if (!video || unmutedRef.current) return;
    video.muted = false;
    video.volume = 1;
    setMuted(false);
    unmutedRef.current = true;
  }, []);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;

    video.volume = 1;
    video.muted = false;
    setMuted(false);

    try {
      await video.play();
      setPlaying(true);
      setNeedsGesture(false);
      unmutedRef.current = true;
      return true;
    } catch {
      video.muted = true;
      setMuted(true);
      try {
        await video.play();
        setPlaying(true);
        setNeedsGesture(false);
        return true;
      } catch {
        setPlaying(false);
        setNeedsGesture(true);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!playThemeSong || !playback?.videoUrl || !video) return;

    unmutedRef.current = false;
    video.src = playback.videoUrl;
    video.loop = true;
    video.volume = 1;
    video.muted = false;
    video.load();
    void tryPlay();
  }, [playThemeSong, playback?.videoUrl, tryPlay]);

  useEffect(() => {
    if (!playing) return;

    const unmuteOnInteraction = () => {
      applyUnmuted();
    };

    for (const event of UNMUTE_EVENTS) {
      window.addEventListener(event, unmuteOnInteraction, { passive: true });
    }

    return () => {
      for (const event of UNMUTE_EVENTS) {
        window.removeEventListener(event, unmuteOnInteraction);
      }
    };
  }, [playing, applyUnmuted]);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  if (!playThemeSong) return null;
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md px-3 py-2.5 shadow-lg animate-pulse",
          className,
        )}
      >
        <Music2 className="w-4 h-4 text-zinc-300/50 shrink-0" />
        <div className="h-8 flex-1 rounded bg-white/10" />
      </div>
    );
  }
  if (!playback) return null;

  const label = playback.songTitle
    ? `${playback.label} · ${playback.songTitle}`
    : playback.label;

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }

    applyUnmuted();
    await tryPlay();
  };

  const toggleMute = async () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    unmutedRef.current = !nextMuted;

    if (!playing) {
      await tryPlay();
    }
  };

  const handleStart = async () => {
    applyUnmuted();
    await tryPlay();
  };

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline preload="auto" />
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg",
          playing && muted && "ring-1 ring-primary/30",
          className,
        )}
      >
        <Music2
          className={cn(
            "w-4 h-4 text-zinc-300 shrink-0",
            playing && !needsGesture && "animate-pulse",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/45">
            {t("anime.themeNowPlaying")}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-white/90 truncate">{label}</p>
        </div>

        {needsGesture ? (
          <button
            type="button"
            onClick={() => void handleStart()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            {t("anime.themePlay")}
          </button>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              aria-label={playing ? t("anime.themePause") : t("anime.themePlay")}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => void toggleMute()}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              aria-label={muted ? t("anime.themeUnmute") : t("anime.themeMuted")}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
