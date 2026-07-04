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

export default function AnimeThemePlayer({ anilistId, className }: AnimeThemePlayerProps) {
  const t = useT();
  const playThemeSong = useSettingsStore((s) => s.playThemeSong);
  const { data: themes, isLoading } = useGetAnimeThemes(anilistId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);

  const playback = themes?.playback;

  const tryPlay = useCallback(async (preferUnmuted: boolean) => {
    const video = videoRef.current;
    if (!video) return false;

    video.muted = !preferUnmuted;
    setMuted(!preferUnmuted);

    try {
      await video.play();
      setPlaying(true);
      setNeedsGesture(false);
      return true;
    } catch {
      if (preferUnmuted) {
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
      setPlaying(false);
      setNeedsGesture(true);
      return false;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!playThemeSong || !playback?.videoUrl || !video) return;

    video.src = playback.videoUrl;
    video.loop = true;
    video.load();
    void tryPlay(true);
  }, [playThemeSong, playback?.videoUrl, tryPlay]);

  useEffect(() => {
    if (!playing || !muted) return;

    const unmuteOnInteraction = () => {
      const video = videoRef.current;
      if (!video || !video.muted) return;
      video.muted = false;
      setMuted(false);
    };

    document.addEventListener("pointerdown", unmuteOnInteraction, { once: true });
    return () => document.removeEventListener("pointerdown", unmuteOnInteraction);
  }, [playing, muted]);

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
        <Music2 className="w-4 h-4 text-violet-300/50 shrink-0" />
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

    await tryPlay(!muted);
  };

  const toggleMute = async () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);

    if (!playing) {
      await tryPlay(!nextMuted);
    }
  };

  const handleStart = async () => {
    await tryPlay(true);
  };

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline preload="auto" />
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg",
          playing && muted && "ring-1 ring-violet-400/30",
          className,
        )}
      >
        <Music2
          className={cn(
            "w-4 h-4 text-violet-300 shrink-0",
            playing && !needsGesture && "animate-pulse",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/45">
            {t("anime.themeNowPlaying")}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-white/90 truncate">{label}</p>
          {playing && muted && !needsGesture && (
            <p className="text-[10px] text-violet-200/70 mt-0.5">{t("anime.themeTapToUnmute")}</p>
          )}
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
