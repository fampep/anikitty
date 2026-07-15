"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/layout/container";
import AnimeCard from "@/components/anime/anime-card";
import { IAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";
import { SectionHeading } from "./section-heading";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CARD_W = 160;

type Props = {
  trendingAnime: IAnime[];
  loading: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showRanks?: boolean;
  layout?: "grid" | "row";
  seeAllHref?: string;
  sectionId?: string;
};

const AnimeSections = ({ trendingAnime, loading, title, subtitle, icon, showRanks, layout = "grid", seeAllHref, sectionId }: Props) => {
  if (loading) return <LoadingSkeleton layout={layout} sectionId={sectionId} />;
  if (!trendingAnime?.length) return null;

  if (layout === "row") {
    return (
      <RowLayout
        trendingAnime={trendingAnime}
        title={title}
        subtitle={subtitle}
        icon={icon}
        showRanks={showRanks}
        seeAllHref={seeAllHref}
        sectionId={sectionId}
      />
    );
  }

  return (
    <Container id={sectionId} className="flex flex-col gap-4 items-center lg:items-start scroll-mt-[calc(var(--nav-height)+1rem)]">
      <SectionHeading icon={icon} title={title} subtitle={subtitle} href={seeAllHref} />
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
        {trendingAnime.map((anime, idx) => (
          <AnimeCard
            key={anime.id ?? idx}
            title={anime.name}
            subTitle={anime.type}
            poster={anime.poster}
            className="w-full"
            href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
            episodeCard
            sub={anime?.episodes?.sub}
            dub={anime?.episodes?.dub}
            rank={showRanks ? idx + 1 : undefined}
            score={anime.score}
            year={anime.year}
            status={anime.status}
          />
        ))}
      </div>
    </Container>
  );
};

function RowLayout({
  trendingAnime,
  title,
  subtitle,
  icon,
  showRanks,
  seeAllHref,
  sectionId,
}: {
  trendingAnime: IAnime[];
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showRanks?: boolean;
  seeAllHref?: string;
  sectionId?: string;
}) {
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
  }, [trendingAnime, scrollRoot]);

  const scroll = (dir: "left" | "right") => {
    scrollRoot?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  return (
    <Container id={sectionId} className="flex flex-col gap-4 items-start scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <SectionHeading icon={icon} title={title} subtitle={subtitle} href={seeAllHref} />
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
          <div className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-background to-transparent dark:from-black z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-14 bg-gradient-to-l from-background to-transparent dark:from-black z-10 pointer-events-none" />
        )}
        <div
          ref={setScrollRoot}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-momentum"
        >
          {trendingAnime.map((anime, idx) => (
            <div
              key={anime.id ?? idx}
              style={{ width: CARD_W, contentVisibility: "auto", containIntrinsicSize: "240px 360px" }}
              className="shrink-0"
            >
              <AnimeCard
                compact
                deferImage
                imageRoot={scrollRoot}
                title={anime.name}
                subTitle={anime.type}
                poster={anime.poster}
                className="w-full max-w-none"
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                episodeCard
                sub={anime?.episodes?.sub}
                dub={anime?.episodes?.dub}
                rank={showRanks ? idx + 1 : undefined}
                score={anime.score}
                year={anime.year}
                status={anime.status}
              />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

const LoadingSkeleton = ({ layout, sectionId }: { layout?: "grid" | "row"; sectionId?: string }) => (
  <Container id={sectionId} className="flex flex-col gap-4 py-2 items-start scroll-mt-[calc(var(--nav-height)+1rem)]">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-muted dark:bg-white/15 animate-pulse" />
      <div className="h-6 w-48 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    {layout === "row" ? (
      <div className="flex gap-4 overflow-hidden w-full">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-muted/50 dark:bg-white/5" />
        ))}
      </div>
    ) : (
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-3 md:gap-4">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-muted/50 dark:bg-white/5" />
        ))}
      </div>
    )}
  </Container>
);

export default AnimeSections;
