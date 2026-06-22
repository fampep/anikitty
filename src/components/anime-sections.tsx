"use client";

import React from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import BlurFade from "./ui/blur-fade";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";
import { SectionHeading } from "./section-heading";

type Props = {
  trendingAnime: IAnime[];
  loading: boolean;
  title: string;
};

const AnimeSections = ({ trendingAnime, loading, title }: Props) => {
  if (loading) return <LoadingSkeleton />;
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
      <SectionHeading title={title} />
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
        {trendingAnime?.map((anime, idx) => (
          <BlurFade key={anime.id ?? idx} delay={idx * 0.04} inView>
            <AnimeCard
              title={anime.name}
              subTitle={anime.type}
              poster={anime.poster}
              className="self-center justify-self-center w-full"
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              episodeCard
              sub={anime?.episodes?.sub}
              dub={anime?.episodes?.dub}
            />
          </BlurFade>
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
    <div className="flex items-center gap-3">
      <div className="w-1 h-6 bg-green-600 rounded-full animate-pulse" />
      <div className="h-7 w-48 animate-pulse bg-green-950/60 rounded" />
    </div>
    <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
      {Array.from({ length: 10 }).map((_, idx) => (
        <div key={idx} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-green-950/40" />
      ))}
    </div>
  </Container>
);

export default AnimeSections;
