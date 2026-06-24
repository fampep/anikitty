"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import BlurFade from "./ui/blur-fade";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";
import { SectionHeading } from "./section-heading";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CARD_W = 130;

type Props = {
  trendingAnime: IAnime[];
  loading: boolean;
  title: string;
  icon?: React.ReactNode;
  showRanks?: boolean;
  layout?: "grid" | "row";
  seeAllHref?: string;
};

const AnimeSections = ({ trendingAnime, loading, title, icon, showRanks, layout = "grid", seeAllHref }: Props) => {
  if (loading) return <LoadingSkeleton layout={layout} />;
  if (!trendingAnime?.length) return null;

  if (layout === "row") {
    return <RowLayout trendingAnime={trendingAnime} title={title} icon={icon} showRanks={showRanks} seeAllHref={seeAllHref} />;
  }

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
      <SectionHeading icon={icon} title={title} href={seeAllHref} />
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
        {trendingAnime.map((anime, idx) => (
          <BlurFade key={anime.id ?? idx} delay={idx * 0.03} inView>
            <AnimeCard
              title={anime.name}
              subTitle={anime.type}
              poster={anime.poster}
              className="w-full"
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              episodeCard
              sub={anime?.episodes?.sub}
              dub={anime?.episodes?.dub}
              rank={showRanks ? idx + 1 : undefined}
            />
          </BlurFade>
        ))}
      </div>
    </Container>
  );
};

function RowLayout({
  trendingAnime,
  title,
  icon,
  showRanks,
  seeAllHref,
}: {
  trendingAnime: IAnime[];
  title: string;
  icon?: React.ReactNode;
  showRanks?: boolean;
  seeAllHref?: string;
}) {
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
  }, [trendingAnime]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  return (
    <Container className="flex flex-col gap-4 py-8 items-start">
      <div className="flex items-center gap-3 w-full">
        <SectionHeading icon={icon} title={title} href={seeAllHref} />
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
          {trendingAnime.map((anime, idx) => (
            <BlurFade key={anime.id ?? idx} delay={idx * 0.02} inView>
              <div style={{ width: CARD_W }} className="shrink-0">
                <AnimeCard
                  compact
                  title={anime.name}
                  subTitle={anime.type}
                  poster={anime.poster}
                  className="w-full max-w-none"
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  episodeCard
                  sub={anime?.episodes?.sub}
                  dub={anime?.episodes?.dub}
                  rank={showRanks ? idx + 1 : undefined}
                />
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </Container>
  );
}

const LoadingSkeleton = ({ layout }: { layout?: "grid" | "row" }) => (
  <Container className="flex flex-col gap-4 py-8 items-start">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-white/15 animate-pulse" />
      <div className="h-6 w-48 animate-pulse bg-white/8 rounded" />
    </div>
    {layout === "row" ? (
      <div className="flex gap-2.5 overflow-hidden w-full">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-white/5" />
        ))}
      </div>
    ) : (
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-white/5" />
        ))}
      </div>
    )}
  </Container>
);

export default AnimeSections;
