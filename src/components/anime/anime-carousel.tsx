"use client";

import React, { useRef, useState, useCallback } from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Props = {
  anime: IAnime[];
  title: string;
  className?: string;
};

const CARD_W = 130;
const SCROLL_BY = CARD_W * 4;

const AnimeCarousel = ({ anime, title, className }: Props) => {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({
      left: dir * SCROLL_BY,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  if (!anime?.length) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
        <h5 className="text-xl font-bold text-foreground dark:text-white tracking-tight">{title}</h5>
        <span className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 px-2 py-0.5 rounded-full">
          {anime.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={!canLeft}
            aria-label={t("common.scrollLeft")}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:bg-accent dark:hover:bg-white/10 hover:border-border dark:hover:border-white/25 hover:text-foreground/90 dark:hover:text-white/80 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={!canRight}
            aria-label={t("common.scrollRight")}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:bg-accent dark:hover:bg-white/10 hover:border-border dark:hover:border-white/25 hover:text-foreground/90 dark:hover:text-white/80 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative">
        {canLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        )}
        {canRight && (
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={cn(
            "flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            !reducedMotion && "scroll-smooth",
          )}
        >
          {anime.map((ani) => (
            <div key={ani.id ?? ani.name} className="shrink-0 w-[144px]">
              <AnimeCard
                title={ani.name}
                subTitle={ani.type}
                episodeCard
                sub={ani.episodes?.sub}
                dub={ani.episodes?.dub}
                href={`${ROUTES.ANIME_DETAILS}/${ani.id}`}
                poster={ani.poster}
                compact
                score={ani.score}
                year={ani.year}
                status={ani.status}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimeCarousel;
