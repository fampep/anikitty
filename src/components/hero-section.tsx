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

  // Auto-advance every 7s
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
          className="rounded-full bg-black/30 border border-green-600/40 hover:bg-green-900/60 hover:border-green-400 backdrop-blur-sm h-10 w-10"
        >
          <ArrowLeft className="h-4 w-4 text-green-400" />
        </Button>
        <Button
          onClick={() => api?.scrollNext()}
          size="icon"
          className="rounded-full bg-black/30 border border-green-600/40 hover:bg-green-900/60 hover:border-green-400 backdrop-blur-sm h-10 w-10"
        >
          <ArrowRight className="h-4 w-4 text-green-400" />
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
                  ? "w-5 h-1.5 bg-green-400"
                  : "w-1.5 h-1.5 bg-green-800/80 hover:bg-green-600"
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
    <div className="absolute inset-0 bg-gradient-to-r from-[#020f04] via-[#020f04]/70 to-transparent z-10" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#020f04] via-transparent to-[#020f04]/20 z-10" />

    {/* Content */}
    <div className="absolute inset-0 z-20 flex items-end md:items-center pb-20 md:pb-0">
      <Container className="w-full">
        <div className="max-w-xl space-y-4">
          {/* Rank + type */}
          <div className="flex items-center gap-2">
            {anime.rank && (
              <span className="text-xs font-mono font-bold text-green-400 bg-green-900/50 border border-green-700/50 px-2 py-0.5 rounded">
                #{anime.rank}
              </span>
            )}
            {anime.type && (
              <span className="text-xs font-mono text-green-600 uppercase tracking-widest">
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
              <span className="inline-flex items-center gap-1 bg-emerald-900/90 text-emerald-300 border border-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                <Captions className="h-3 w-3" />
                SUB {anime.episodes.sub}
              </span>
            )}
            {anime.episodes?.dub != null && anime.episodes.dub > 0 && (
              <span className="inline-flex items-center gap-1 bg-green-800/90 text-green-200 border border-green-600 text-xs font-bold px-2.5 py-1 rounded-full">
                <Mic className="h-3 w-3" />
                DUB {anime.episodes.dub}
              </span>
            )}
            {anime.otherInfo?.slice(0, 3).map((info, i) => (
              <span key={i} className="text-xs text-green-600/80 font-mono">
                {info}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-green-100/70 line-clamp-3 leading-relaxed">
            {parse(anime?.description ?? "")}
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-3 !mt-6">
            <ButtonLink
              href={`${ROUTES.WATCH}?anime=${anime.id}`}
              className="flex items-center gap-2 h-11 bg-green-500 hover:bg-green-400 text-[#010b02] font-bold px-6 rounded-xl kitty-glow transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </ButtonLink>
            <ButtonLink
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="flex items-center gap-2 h-11 bg-black/30 border border-green-600/50 text-green-300 hover:bg-green-900/40 hover:border-green-400 px-5 rounded-xl backdrop-blur-sm transition-all"
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
  <div className="h-[85vh] w-full relative bg-[#020f04]">
    <div className="absolute inset-0 flex items-end md:items-center pb-20 md:pb-0">
      <Container className="w-full">
        <div className="max-w-xl space-y-4">
          <div className="h-5 w-24 animate-pulse bg-green-950/80 rounded" />
          <div className="h-12 w-3/4 animate-pulse bg-green-950/80 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse bg-green-950/60 rounded-full" />
            <div className="h-6 w-20 animate-pulse bg-green-950/60 rounded-full" />
          </div>
          <div className="h-4 w-full animate-pulse bg-green-950/60 rounded" />
          <div className="h-4 w-5/6 animate-pulse bg-green-950/60 rounded" />
          <div className="h-4 w-4/6 animate-pulse bg-green-950/60 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-36 animate-pulse bg-green-900/60 rounded-xl" />
            <div className="h-11 w-28 animate-pulse bg-green-950/60 rounded-xl" />
          </div>
        </div>
      </Container>
    </div>
  </div>
);

export default HeroSection;
