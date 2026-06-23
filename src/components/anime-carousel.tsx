"use client";

import React from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import BlurFade from "./ui/blur-fade";
import { ROUTES } from "@/constants/routes";

type Props = {
  anime: IAnime[];
  title: string;
  className?: string;
};

const AnimeCarousel = (props: Props) => {
  const [api, setApi] = React.useState<CarouselApi>();

  if (!props.anime?.length) return null;

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-px h-5 bg-white/30" />
          <h5 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {props.title}
          </h5>
          <span className="text-[11px] font-mono text-white/25 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            {props.anime.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => api?.scrollPrev()}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:border-white/25 hover:text-white/80 transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => api?.scrollNext()}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:border-white/25 hover:text-white/80 transition-all active:scale-95"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Carousel with gradient edge fades */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        <Carousel className="w-full" setApi={setApi} opts={{}}>
          <CarouselContent className="w-full">
            {props.anime.map((ani, idx) => (
              <CarouselItem
                key={idx}
                className="lg:basis-[1/5] basis-[1/2] sm:basis-[1/3] md:basis-[1/4] xl:basis-[1/6] 2xl:basis-[1/7]"
              >
                <BlurFade delay={idx * 0.04} inView>
                  <AnimeCard
                    title={ani.name}
                    subTitle={ani.type}
                    episodeCard
                    sub={ani.episodes.sub}
                    dub={ani.episodes.dub}
                    href={`${ROUTES.ANIME_DETAILS}/${ani.id}`}
                    poster={ani.poster}
                    className="self-center justify-self-center min-w-[12rem]"
                  />
                </BlurFade>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
};

export default AnimeCarousel;
