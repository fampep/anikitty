"use client";

import React from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { LatestCompletedAnime } from "@/types/anime";
import { SectionHeading } from "./section-heading";

type Props = {
  latestEpisodes: LatestCompletedAnime[];
  loading: boolean;
};

const LatestEpisodesAnime = ({ latestEpisodes, loading }: Props) => {
  if (loading) return <LoadingSkeleton />;
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start lg:mt-[-10.125rem] z-20">
      <SectionHeading emoji="🐱" title="Recent Releases" />
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
        {latestEpisodes?.map((anime, idx) => (
          <BlurFade key={anime.id ?? idx} delay={idx * 0.04} inView>
            <AnimeCard
              title={anime.name}
              subTitle={anime.type}
              poster={anime.poster}
              className="self-center justify-self-center w-full"
              href={`${ROUTES.WATCH}?anime=${anime.id}&type=latest`}
              episodeCard
              sub={anime.episodes.sub}
              dub={anime.episodes.dub}
            />
          </BlurFade>
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-5 py-10 items-center lg:items-start lg:mt-[-10.125rem] z-20">
    <div className="flex items-center gap-3">
      <div className="w-1 h-6 bg-green-600 rounded-full animate-pulse" />
      <div className="h-7 w-44 animate-pulse bg-green-950/60 rounded" />
    </div>
    <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
      {Array.from({ length: 10 }).map((_, idx) => (
        <div key={idx} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-green-950/40" />
      ))}
    </div>
  </Container>
);

export default LatestEpisodesAnime;
