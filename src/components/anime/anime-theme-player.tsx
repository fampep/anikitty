"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ListMusic, Music2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useGetAnimeThemes } from "@/query/anime/get-anime-themes";
import { formatThemeDisplayLabel } from "@/lib/anime/animethemes-api";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";

type AnimeThemePlayerProps = {
  anilistId: number;
  /** Site anime id / slug for the full themes page link. */
  slug?: string | number;
  className?: string;
};

export default function AnimeThemePlayer({ anilistId, slug, className }: AnimeThemePlayerProps) {
  const t = useT();
  const playThemeSong = useSettingsStore((s) => s.playThemeSong);
  const setPlayThemeSong = useSettingsStore((s) => s.setPlayThemeSong);
  const { data: themes, isLoading } = useGetAnimeThemes(anilistId);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** User explicitly muted — never auto-unmute over this. */
  const userMutedRef = useRef(false);
  /** User explicitly paused — don't fight with autoplay retries. */
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const playback = themes?.playback;
  const themeCount = themes?.playables?.length ?? 0;

  const syncFromVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(!video.paused);
    setMuted(video.muted || video.volume === 0);
  }, []);

  const tryPlay = useCallback(async (opts?: { unmuted?: boolean }) => {
    const video = videoRef.current;
    if (!video) return false;

    const preferUnmuted = opts?.unmuted ?? !userMutedRef.current;

    if (preferUnmuted) {
      video.muted = false;
      video.volume = 1;
    } else {
      video.muted = true;
    }

    try {
      await video.play();
      userPausedRef.current = false;
      setNeedsGesture(false);
      syncFromVideo();
      return true;
    } catch {
      if (!video.muted) {
        video.muted = true;
        try {
          await video.play();
          userPausedRef.current = false;
          setNeedsGesture(false);
          syncFromVideo();
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
  }, [syncFromVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!playThemeSong || dismissed || !playback?.videoUrl || !video) return;

    userPausedRef.current = false;
    userMutedRef.current = false;
    video.src = playback.videoUrl;
    video.loop = true;
    video.volume = 1;
    video.muted = true;
    setMuted(true);
    video.load();

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolume = () => setMuted(video.muted || video.volume === 0);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);

    void (async () => {
      const ok = await tryPlay({ unmuted: true });
      if (!ok || userPausedRef.current) return;
      syncFromVideo();
    })();

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
      video.pause();
    };
  }, [playThemeSong, dismissed, playback?.videoUrl, tryPlay, syncFromVideo]);

  if (!playThemeSong || dismissed) return null;
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

  const label = formatThemeDisplayLabel(playback);

  const togglePlay = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      userPausedRef.current = true;
      video.pause();
      setPlaying(false);
      return;
    }

    userPausedRef.current = false;
    try {
      if (!userMutedRef.current) {
        video.muted = false;
        video.volume = 1;
      }
      await video.play();
      setNeedsGesture(false);
      syncFromVideo();
    } catch {
      await tryPlay({ unmuted: !userMutedRef.current });
    }
  };

  const toggleMute = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = 1;
    userMutedRef.current = nextMuted;
    setMuted(nextMuted);
  };

  const handleStart = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    userPausedRef.current = false;
    userMutedRef.current = false;
    await tryPlay({ unmuted: true });
  };

  const turnOff = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    userPausedRef.current = true;
    setPlaying(false);
    setDismissed(true);
    setPlayThemeSong(false);
  };

  const themesHref =
    slug != null ? `${ROUTES.ANIME_DETAILS}/${slug}?tab=themes` : null;

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline preload="auto" />
      <div
        className={cn(
          "flex items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-black/45 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg",
          playing && muted && "ring-1 ring-primary/30",
          className,
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
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
            {playback.versionLabel ? ` · ${playback.versionLabel}` : ""}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-white/90 truncate">{label}</p>
          {playing && muted ? (
            <p className="text-[10px] text-white/40 truncate">{t("anime.themeTapToUnmute")}</p>
          ) : themesHref && themeCount > 1 ? (
            <Link
              href={themesHref}
              className="text-[10px] text-white/50 hover:text-white/80 truncate inline-flex items-center gap-1 transition-colors"
            >
              <ListMusic className="w-3 h-3" />
              {t("anime.themesBrowseAll", { n: themeCount })}
            </Link>
          ) : null}
        </div>

        {needsGesture ? (
          <button
            type="button"
            onClick={(e) => void handleStart(e)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white/90 transition-colors shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            {t("anime.themePlay")}
          </button>
        ) : (
          <div className="flex items-center gap-0.5 shrink-0">
            {themesHref ? (
              <Link
                href={themesHref}
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
                aria-label={t("anime.themesPageTitle")}
                title={t("anime.themesPageTitle")}
              >
                <ListMusic className="w-4 h-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={(e) => void togglePlay(e)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              aria-label={playing ? t("anime.themePause") : t("anime.themePlay")}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              aria-label={muted ? t("anime.themeUnmute") : t("anime.themeMuted")}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={turnOff}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 transition-colors"
              aria-label={t("anime.themeTurnOff")}
              title={t("anime.themeTurnOff")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
