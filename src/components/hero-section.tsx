"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";

import Container from "./container";
import { Button } from "./ui/button";
import Image from "next/image";

import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, Captions, Mic, Play, Info } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ButtonLink } from "./common/button-link";
import { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isNearSlide(index: number, current: number, total: number): boolean {
  if (total <= 1) return true;
  const diff = Math.abs(index - current);
  return diff <= 1 || diff === total - 1;
}

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
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") api.scrollNext();
    }, 7000);
    return () => clearInterval(timer);
  }, [api, count]);

  useEffect(() => {
    if (!api) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") api.scrollPrev();
      if (e.key === "ArrowRight") api.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="h-[48vh] sm:h-[52vh] md:h-[56vh] max-h-[480px] w-full relative overflow-hidden">
      <Carousel className="w-full h-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="h-full">
          {spotlightAnime?.map((anime, index) => (
            <CarouselItem key={anime.id ?? index} className="h-full">
              <HeroCarouselItem
                anime={anime}
                isNearActive={isNearSlide(index, current, spotlightAnime.length)}
                priority={index === 0}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Bottom controls row */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12">
        {/* Slide counter */}
        <span className="text-white/30 text-xs font-mono tracking-widest hidden md:block">
          <span className="text-white/70">{String(current + 1).padStart(2, "0")}</span>
          {" / "}
          {String(count).padStart(2, "0")}
        </span>

        {/* Progress bar indicators */}
        {count > 1 && (
          <div className="flex items-center gap-1 mx-auto md:mx-0 md:absolute md:left-1/2 md:-translate-x-1/2">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                className={`h-[3px] rounded-full overflow-hidden bg-white/20 hover:bg-white/35 transition-all duration-300 ${
                  i === current ? "w-8" : "w-3"
                }`}
              >
                {i === current && (
                  <div
                    key={current}
                    className="h-full bg-white rounded-full"
                    style={{ animation: "progressBar 7s linear forwards", width: "0%" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Nav arrows */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            onClick={() => api?.scrollPrev()}
            size="icon"
            className="rounded-full bg-black/40 border border-white/15 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm h-9 w-9 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-white/70" />
          </Button>
          <Button
            onClick={() => api?.scrollNext()}
            size="icon"
            className="rounded-full bg-black/40 border border-white/15 hover:bg-white/10 hover:border-white/30 backdrop-blur-sm h-9 w-9 transition-all"
          >
            <ArrowRight className="h-3.5 w-3.5 text-white/70" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const HeroCarouselItem = ({
  anime,
  isNearActive,
  priority = false,
}: {
  anime: SpotlightAnime;
  isNearActive: boolean;
  priority?: boolean;
}) => {
  const t = useT();
  return (
  <div className="w-full h-[48vh] sm:h-[52vh] md:h-[56vh] max-h-[480px] relative overflow-hidden bg-black">
    {isNearActive && anime?.poster ? (
      <Image
        src={anime.poster}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-center"
      />
    ) : null}
    {/* Layered cinematic gradients */}
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent z-10" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40 z-10" />
    <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black/60 to-transparent z-10" />

    {/* Content */}
    <div className="absolute inset-0 z-20 flex items-end md:items-center pb-14 sm:pb-16 md:pb-0">
      <Container className="w-full">
        <div className="max-w-lg space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            {anime.rank && (
              <span className="text-[11px] font-mono font-bold text-white/80 bg-white/8 border border-white/15 px-2 py-0.5 rounded-md">
                #{anime.rank}
              </span>
            )}
            {anime.type && (
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                {anime.type}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black leading-[1.05] text-white">
            {anime.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {anime.episodes?.sub != null && anime.episodes.sub > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/10 text-white/90 border border-white/15 text-xs font-bold px-2.5 py-1 rounded-full">
                <Captions className="h-3 w-3" />
                SUB {anime.episodes.sub}
              </span>
            )}
            {anime.episodes?.dub != null && anime.episodes.dub > 0 && (
              <span className="inline-flex items-center gap-1 bg-white/10 text-white/90 border border-white/15 text-xs font-bold px-2.5 py-1 rounded-full">
                <Mic className="h-3 w-3" />
                DUB {anime.episodes.dub}
              </span>
            )}
            {anime.otherInfo?.slice(0, 3).map((info, i) => (
              <span key={i} className="text-xs text-white/40 font-mono hidden sm:inline">
                {info}
              </span>
            ))}
          </div>

          <p className="text-sm md:text-[15px] text-white/55 line-clamp-2 sm:line-clamp-3 leading-relaxed hidden xs:block">
            {stripHtml(anime?.description ?? "")}
          </p>

          <div className="w-12 h-px bg-white/20" />

          <div className="flex items-center gap-2 sm:gap-3">
            <ButtonLink
              href={`${ROUTES.WATCH}?anime=${anime.id}`}
              className="flex items-center gap-2 h-10 sm:h-11 bg-white text-black font-bold px-4 sm:px-6 rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-white/10 text-sm"
            >
              <Play className="h-4 w-4 fill-current" />
              {t("home.watchNow")}
            </ButtonLink>
            <ButtonLink
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="flex items-center gap-2 h-10 sm:h-11 bg-white/5 border border-white/20 text-white/80 hover:bg-white/10 hover:border-white/35 px-4 sm:px-5 rounded-xl transition-all text-sm"
            >
              <Info className="h-4 w-4" />
              {t("home.details")}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  </div>
  );
};

const LoadingSkeleton = () => (
  <div className="h-[48vh] sm:h-[52vh] md:h-[56vh] max-h-[480px] w-full relative bg-black">
    <div className="absolute inset-0 flex items-end md:items-center pb-14 sm:pb-16 md:pb-0">
      <Container className="w-full">
        <div className="max-w-lg space-y-4">
          <div className="h-4 w-20 animate-pulse bg-white/10 rounded-md" />
          <div className="h-14 w-4/5 animate-pulse bg-white/10 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse bg-white/10 rounded-full" />
            <div className="h-7 w-20 animate-pulse bg-white/10 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full animate-pulse bg-white/6 rounded" />
            <div className="h-3.5 w-5/6 animate-pulse bg-white/6 rounded" />
            <div className="h-3.5 w-4/6 animate-pulse bg-white/6 rounded" />
          </div>
          <div className="w-12 h-px bg-white/10" />
          <div className="flex gap-3">
            <div className="h-11 w-36 animate-pulse bg-white/15 rounded-xl" />
            <div className="h-11 w-28 animate-pulse bg-white/8 rounded-xl" />
          </div>
        </div>
      </Container>
    </div>
  </div>
);

export default HeroSection;
