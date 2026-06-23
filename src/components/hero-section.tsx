"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";

import Container from "./container";
import { Button } from "./ui/button";
import parse from "html-react-parser";

import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, Captions, Mic, Play, Info } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ButtonLink } from "./common/button-link";
import { SpotlightAnime } from "@/types/anime";

type IHeroSectionProps = {
  spotlightAnime: SpotlightAnime[];
  isDataLoading: boolean;
};

const HeroSection = ({ spotlightAnime, isDataLoading }: IHeroSectionProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api || !count) return;
    const timer = setInterval(() => api.scrollNext(), 7000);
    return () => clearInterval(timer);
  }, [api, count]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="h-[85vh] w-full relative overflow-hidden">
      <Carousel className="w-full h-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="h-full">
          {spotlightAnime?.map((anime, index) => (
            <CarouselItem key={index} className="h-full">
              <HeroCarouselItem anime={anime} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Nav arrows */}
      <div className="absolute hidden md:flex items-center gap-3 right-8 bottom-24 z-50">
        <Button
          onClick={() => api?.scrollPrev()}
          size="icon"
          className="rounded-full bg-black/40 border border-white/20 hover:bg-white/15 backdrop-blur-sm h-10 w-10"
        >
          <ArrowLeft className="h-4 w-4 text-white/80" />
        </Button>
        <Button
          onClick={() => api?.scrollNext()}
          size="icon"
          className="rounded-full bg-black/40 border border-white/20 hover:bg-white/15 backdrop-blur-sm h-10 w-10"
        >
          <ArrowRight className="h-4 w-4 text-white/80" />
        </Button>
      </div>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-5 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HeroCarouselItem = ({ anime }: { anime: SpotlightAnime }) => (
  <div
    className="w-full h-[85vh] bg-cover bg-no-repeat bg-center relative"
    style={{ backgroundImage: `url(${anime?.poster})` }}
  >
    {/* Gradient overlays */}
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20 z-10" />

    {/* Content */}
    <div className="absolute inset-0 z-20 flex items-end md:items-center pb-20 md:pb-0">
      <Container className="w-full">
        <div className="max-w-xl space-y-4">
          {/* Rank + type */}
          <div className="flex items-center gap-2">
            {anime.rank && (
              <span className="text-xs font-mono font-bold text-white/90 bg-white/10 border border-white/20 px-2 py-0.5 rounded">
                #{anime.rank}
              </span>
            )}
            {anime.type && (
              <span className="text-xs font-mono text-white/50 uppercase tracking-widest">
                {anime.type}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-black leading-tight text-white drop-shadow-lg">
            {anime.name}
          </h1>

          {/* Episode + info badges */}
          <div className="flex flex-wrap items-center gap-2">
            {anime.episodes?.sub != null && anime.episodes.sub > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/10 text-white border border-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
                <Captions className="h-3 w-3" />
                SUB {anime.episodes.sub}
              </span>
            )}
            {anime.episodes?.dub != null && anime.episodes.dub > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/10 text-white border border-white/20 text-xs font-bold px-2.5 py-1 rounded-full">
                <Mic className="h-3 w-3" />
                DUB {anime.episodes.dub}
              </span>
            )}
            {anime.otherInfo?.slice(0, 3).map((info, i) => (
              <span key={i} className="text-xs text-white/50 font-mono">
                {info}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-white/65 line-clamp-3 leading-relaxed">
            {parse(anime?.description ?? "")}
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 !mt-6">
            <ButtonLink
              href={`${ROUTES.WATCH}?anime=${anime.id}`}
              className="flex items-center gap-2 h-11 bg-white text-black font-bold px-6 rounded-xl hover:bg-white/90 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </ButtonLink>
            <ButtonLink
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="flex items-center gap-2 h-11 bg-black/30 border border-white/25 text-white/80 hover:bg-white/10 hover:border-white/40 px-5 rounded-xl backdrop-blur-sm transition-all"
            >
              <Info className="h-4 w-4" />
              Details
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="h-[85vh] w-full relative bg-black">
    <div className="absolute inset-0 flex items-end md:items-center pb-20 md:pb-0">
      <Container className="w-full">
        <div className="max-w-xl space-y-4">
          <div className="h-5 w-24 animate-pulse bg-white/10 rounded" />
          <div className="h-12 w-3/4 animate-pulse bg-white/10 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse bg-white/10 rounded-full" />
            <div className="h-6 w-20 animate-pulse bg-white/10 rounded-full" />
          </div>
          <div className="h-4 w-full animate-pulse bg-white/8 rounded" />
          <div className="h-4 w-5/6 animate-pulse bg-white/8 rounded" />
          <div className="h-4 w-4/6 animate-pulse bg-white/8 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-36 animate-pulse bg-white/15 rounded-xl" />
            <div className="h-11 w-28 animate-pulse bg-white/10 rounded-xl" />
          </div>
        </div>
      </Container>
    </div>
  </div>
);

export default HeroSection;
