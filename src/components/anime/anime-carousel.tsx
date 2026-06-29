"use client";

import React, { useRef, useState, useCallback } from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";

type Props = {
  anime: IAnime[];
  title: string;
  className?: string;
};

const CARD_W = 130;
const SCROLL_BY = CARD_W * 4;

const AnimeCarousel = ({ anime, title, className }: Props) => {
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
    scrollRef.current?.scrollBy({ left: dir * SCROLL_BY, behavior: "smooth" });
  };

  if (!anime?.length) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
        <h5 className="text-xl font-bold text-white tracking-tight">{title}</h5>
        <span className="text-[11px] font-mono text-white/25 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          {anime.length}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => scroll(-1)}
            disabled={!canLeft}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:border-white/25 hover:text-white/80 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canRight}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:border-white/25 hover:text-white/80 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
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
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {anime.map((ani, idx) => (
            <div key={idx} className="shrink-0 w-[144px]">
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
