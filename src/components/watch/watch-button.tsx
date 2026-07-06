"use client";

import React from "react";
import { CirclePlay } from "lucide-react";
import { ROUTES } from "@/constants/routes";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/common/button-link";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";

import { useGetLastEpisodeWatched } from "@/hooks/use-get-last-episode-watched";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import { useT } from "@/providers/i18n-provider";

const WatchButton = () => {
  const t = useT();
  const pathName = usePathname();
  const animeId = pathName.split("/")[2];

  const { hasWatchedAnime } = useHasAnimeWatched(animeId);
  const latestEpisodeWatched = useGetLastEpisodeWatched(animeId);
  const { data: episodes, isLoading } = useGetAllEpisodes(animeId);

  if (!isLoading && (episodes?.totalEpisodes ?? 0) === 0) {
    return null;
  }

  const resumeNumber = hasWatchedAnime
    ? episodes?.episodes?.find((e) => e.episodeId === latestEpisodeWatched)?.number
    : undefined;

  const label = !hasWatchedAnime
    ? t("landing.startWatching")
    : resumeNumber != null
      ? t("anime.continueEpisode", { n: resumeNumber })
      : t("home.continueWatching");

  return (
    <ButtonLink
      href={
        !hasWatchedAnime
          ? `${ROUTES.WATCH}?anime=${animeId}`
          : `${ROUTES.WATCH}?anime=${animeId}&episode=${latestEpisodeWatched}`
      }
      className="max-w-fit text-base px-5 py-2.5 font-semibold border-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all"
      LeftIcon={CirclePlay}
      classNames={{ leftIcon: "fill-white/20" }}
    >
      {label}
    </ButtonLink>
  );
};

export default WatchButton;
