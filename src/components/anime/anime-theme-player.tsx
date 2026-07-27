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

function dismissedKey(anilistId: number) {
  return `anikitty:theme-dismissed:${anilistId}`;
}

export default function AnimeThemePlayer({ anilistId, slug, className }: AnimeThemePlayerProps) {
  const t = useT();
  const playThemeSong = useSettingsStore((s) => s.playThemeSong);
  const setPlayThemeSong = useSettingsStore((s) => s.setPlayThemeSong);
  const { data: themes, isLoading } = useGetAnimeThemes(anilistId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const userMutedRef = useRef(false);
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(dismissedKey(anilistId)) === "1";
    } catch {
      return false;
    }
  });

  const playback = themes?.playback;
  const themeCount = themes?.playables?.length ?? 0;

  const syncFromVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(!video.paused);
    setMuted(video.muted || video.volume === 0);
  }, []);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || userPausedRef.current) return false;

    if (!userMutedRef.current) {
      video.muted = false;
      video.volume = 1;
    } else {
      video.muted = true;
    }

    try {
      await video.play();
      setNeedsGesture(false);
      syncFromVideo();
      return true;
    } catch {
      if (!video.muted) {
        video.muted = true;
        try {
          await video.play();
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
    if (!playThemeSong || dismissed || !playback?.videoUrl || !video) {
      video?.pause();
      return;
    }

    const onPlay = () => {
      if (!userPausedRef.current) setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onVolume = () => setMuted(video.muted || video.volume === 0);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);

    const urlChanged = loadedUrlRef.current !== playback.videoUrl;
    if (urlChanged) {
      loadedUrlRef.current = playback.videoUrl;
      userPausedRef.current = false;
      userMutedRef.current = false;
      video.src = playback.videoUrl;
      video.loop = true;
      video.volume = 1;
      video.muted = true;
      setMuted(true);
      video.load();
    }

    if (!userPausedRef.current) {
      void tryPlay();
    }

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
    };
  }, [playThemeSong, dismissed, playback?.videoUrl, tryPlay]);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  if (!playThemeSong || dismissed) return null;
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-white/10 bg-black/70 backdrop-blur-md px-3 py-2.5 shadow-lg animate-pulse",
          className,
        )}
      >
        <div className="h-10 rounded bg-white/10" />
      </div>
    );
  }
  if (!playback) return null;

  const label = formatThemeDisplayLabel(playback);

  const togglePlay = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      userPausedRef.current = true;
      video.pause();
      setPlaying(false);
      return;
    }

    userPausedRef.current = false;
    void (async () => {
      try {
        if (!userMutedRef.current) {
          video.muted = false;
          video.volume = 1;
        }
        await video.play();
        setNeedsGesture(false);
        syncFromVideo();
      } catch {
        await tryPlay();
      }
    })();
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

  const handleStart = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    userPausedRef.current = false;
    userMutedRef.current = false;
    void tryPlay();
  };

  const turnOff = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (video) {
      userPausedRef.current = true;
      video.pause();
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
    }
    loadedUrlRef.current = null;
    setPlaying(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissedKey(anilistId), "1");
    } catch {
      // ignore
    }
    setPlayThemeSong(false);
  };

  const themesHref =
    slug != null ? `${ROUTES.ANIME_DETAILS}/${slug}?tab=themes` : null;

  const controlBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors";

  return (
    <>
      <video ref={videoRef} className="hidden" playsInline preload="auto" />
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-white/15 bg-black/75 backdrop-blur-md shadow-xl overflow-hidden",
          playing && muted && "ring-1 ring-primary/40",
          className,
        )}
      >
        <div className="flex items-start gap-2.5 px-3 pt-2.5 pb-2">
          <Music2
            className={cn(
              "w-4 h-4 text-zinc-300 shrink-0 mt-0.5",
              playing && !needsGesture && "animate-pulse",
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/45">
              {t("anime.themeNowPlaying")}
              {playback.versionLabel ? ` · ${playback.versionLabel}` : ""}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-white/95 truncate">{label}</p>
            {playing && muted ? (
              <p className="text-[10px] text-white/40 truncate">{t("anime.themeTapToUnmute")}</p>
            ) : themesHref && themeCount > 1 ? (
              <Link
                href={themesHref}
                className="text-[10px] text-white/55 hover:text-white/85 truncate inline-flex items-center gap-1 transition-colors mt-0.5"
              >
                <ListMusic className="w-3 h-3" />
                {t("anime.themesBrowseAll", { n: themeCount })}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-white/10 bg-black/40 px-2 py-1.5">
          {needsGesture ? (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-[11px] font-semibold text-white transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {t("anime.themePlay")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => togglePlay(e)}
                className={cn(controlBtn, "flex-1 max-w-[3rem]")}
                aria-label={playing ? t("anime.themePause") : t("anime.themePlay")}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className={controlBtn}
                aria-label={muted ? t("anime.themeUnmute") : t("anime.themeMuted")}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              {themesHref ? (
                <Link
                  href={themesHref}
                  className={controlBtn}
                  aria-label={t("anime.themesPageTitle")}
                  title={t("anime.themesPageTitle")}
                >
                  <ListMusic className="w-4 h-4" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={turnOff}
                className={controlBtn}
                aria-label={t("anime.themeTurnOff")}
                title={t("anime.themeTurnOff")}
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
