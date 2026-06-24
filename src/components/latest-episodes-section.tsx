"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { LatestCompletedAnime } from "@/types/anime";
import { SectionHeading } from "./section-heading";
import { Tv2, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  latestEpisodes: LatestCompletedAnime[];
  loading: boolean;
};

const CARD_W = 130;

const LatestEpisodesAnime = ({ latestEpisodes, loading }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateScroll);
  }, [latestEpisodes]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (loading) return <LoadingSkeleton />;
  if (!latestEpisodes?.length) return null;

  return (
    <Container className="flex flex-col gap-4 py-8 items-start lg:mt-[-10.125rem] z-20">
      <div className="flex items-center gap-3 w-full">
        <SectionHeading icon={<Tv2 className="w-4 h-4" />} title="Recent Releases" href={ROUTES.SEARCH} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative w-full">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-14 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide"
        >
          {latestEpisodes.map((anime, idx) => (
            <BlurFade key={anime.id ?? idx} delay={idx * 0.02} inView>
              <div style={{ width: CARD_W }} className="shrink-0">
                <AnimeCard
                  compact
                  title={anime.name}
                  subTitle={anime.type}
                  poster={anime.poster}
                  className="w-full max-w-none"
                  href={`${ROUTES.WATCH}?anime=${anime.id}&type=latest`}
                  episodeCard
                  sub={anime.episodes.sub}
                  dub={anime.episodes.dub}
                />
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-4 py-8 items-start lg:mt-[-10.125rem] z-20">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-white/15 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="flex gap-2.5 overflow-hidden w-full">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-white/5" />
      ))}
    </div>
  </Container>
);

export default LatestEpisodesAnime;
