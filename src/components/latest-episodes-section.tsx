"use client";

import React from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { LatestCompletedAnime } from "@/types/anime";
import { SectionHeading } from "./section-heading";
import { Tv2 } from "lucide-react";

type Props = {
  latestEpisodes: LatestCompletedAnime[];
  loading: boolean;
};

const LatestEpisodesAnime = ({ latestEpisodes, loading }: Props) => {
  if (loading) return <LoadingSkeleton />;
  if (!latestEpisodes?.length) return null;

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start lg:mt-[-10.125rem] z-20">
      <SectionHeading icon={<Tv2 className="w-4 h-4" />} title="Recent Releases" />
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
        {latestEpisodes.map((anime, idx) => (
          <BlurFade key={anime.id ?? idx} delay={idx * 0.03} inView>
            <AnimeCard
              title={anime.name}
              subTitle={anime.type}
              poster={anime.poster}
              className="w-full"
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
      <div className="w-0.5 h-5 bg-white/20 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
      {Array.from({ length: 10 }).map((_, idx) => (
        <div key={idx} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-white/5" />
      ))}
    </div>
  </Container>
);

export default LatestEpisodesAnime;
