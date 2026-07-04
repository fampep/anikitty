"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/layout/container";
import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import { LatestCompletedAnime } from "@/types/anime";
import { SectionHeading } from "./section-heading";
import { Tv2, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

type Props = {
  latestEpisodes: LatestCompletedAnime[];
  loading: boolean;
};

const CARD_W = 160;

const LatestEpisodesAnime = ({ latestEpisodes, loading }: Props) => {
  const t = useT();
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScroll = () => {
    const el = scrollRoot;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRoot;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateScroll);
  }, [latestEpisodes, scrollRoot]);

  const scroll = (dir: "left" | "right") => {
    scrollRoot?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (loading) return <LoadingSkeleton />;
  if (!latestEpisodes?.length) return null;

  return (
    <Container className="relative z-20 flex flex-col items-start gap-4 py-8">
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <SectionHeading icon={<Tv2 className="w-4 h-4" />} title={t("home.recentReleases")} href={ROUTES.SEARCH} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
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
          ref={setScrollRoot}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-momentum snap-x snap-mandatory"
        >
          {latestEpisodes.map((anime, idx) => (
            <div
              key={anime.id ?? idx}
              style={{ width: CARD_W, contentVisibility: "auto", containIntrinsicSize: "240px 360px" }}
              className="shrink-0 snap-start"
            >
              <AnimeCard
                compact
                deferImage
                imageRoot={scrollRoot}
                title={anime.name}
                subTitle={anime.type}
                poster={anime.poster}
                className="w-full max-w-none"
                href={`${ROUTES.WATCH}?anime=${anime.id}&type=latest`}
                episodeCard
                sub={anime.episodes.sub}
                dub={anime.episodes.dub}
                score={(anime as any).score}
                year={(anime as any).year}
                status={(anime as any).status}
              />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="relative z-20 flex flex-col items-start gap-4 py-8">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-muted dark:bg-white/15 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    <div className="flex gap-4 overflow-hidden w-full">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-muted/50 dark:bg-white/5" />
      ))}
    </div>
  </Container>
);

export default LatestEpisodesAnime;
