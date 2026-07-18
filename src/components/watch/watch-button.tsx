"use client";

import React, { useMemo } from "react";
import { CirclePlay } from "lucide-react";
import { ROUTES } from "@/constants/routes";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/common/button-link";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";

import { useGetLastEpisodeWatched } from "@/hooks/use-get-last-episode-watched";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import { useT } from "@/providers/i18n-provider";
import { useProgressStore } from "@/store/progress-store";

const WatchButton = () => {
  const t = useT();
  const pathName = usePathname();
  const animeId = pathName.split("/")[2];
  const lastSaved = useProgressStore((s) => s.lastSaved);
  const getProgress = useProgressStore((s) => s.getProgress);

  const { hasWatchedAnime } = useHasAnimeWatched(animeId);
  const latestEpisodeWatched = useGetLastEpisodeWatched(animeId);
  const { data: episodes, isLoading } = useGetAllEpisodes(animeId);

  const resumeTime = useMemo(() => {
    if (!hasWatchedAnime || !latestEpisodeWatched) return undefined;
    const progress = getProgress(animeId, latestEpisodeWatched);
    if (!progress || progress.current <= 10) return undefined;
    const pct = progress.duration > 0 ? progress.current / progress.duration : 0;
    if (pct >= 0.95) return undefined;
    return Math.floor(progress.current);
  }, [animeId, getProgress, hasWatchedAnime, latestEpisodeWatched, lastSaved]);

  const resumeNumber = hasWatchedAnime
    ? episodes?.episodes?.find((e) => e.episodeId === latestEpisodeWatched)?.number
    : undefined;

  const label = !hasWatchedAnime
    ? t("landing.startWatching")
    : resumeNumber != null
      ? t("anime.continueEpisode", { n: resumeNumber })
      : t("home.continueWatching");

  const watchHref = useMemo(() => {
    const params = new URLSearchParams({ anime: animeId });
    if (hasWatchedAnime && latestEpisodeWatched) {
      params.set("episode", latestEpisodeWatched);
      if (resumeTime != null) params.set("t", String(resumeTime));
    }
    return `${ROUTES.WATCH}?${params.toString()}`;
  }, [animeId, hasWatchedAnime, latestEpisodeWatched, resumeTime]);

  if (!isLoading) {
    const playable =
      (episodes?.airedCount ?? 0) > 0 ||
      episodes?.episodes.some((ep) => ep.aired !== false);
    if (!playable) return null;
  }

  return (
    <ButtonLink
      href={watchHref}
      className="max-w-fit text-base px-5 py-2.5 font-semibold border-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-black/20 transition-all"
      LeftIcon={CirclePlay}
      classNames={{ leftIcon: "fill-white/20" }}
    >
      {label}
    </ButtonLink>
  );
};

export default WatchButton;
