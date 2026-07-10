"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import Container from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import React, { useEffect } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Info, Play } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ButtonLink } from "@/components/common/button-link";
import { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings-store";
import { trackEvent } from "@/lib/analytics";
import { formatAnimeType } from "./home-shared";

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
  onActivePosterChange?: (poster: string | undefined) => void;
};

const HeroSection = ({ spotlightAnime, isDataLoading, onActivePosterChange }: IHeroSectionProps) => {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const pauseCarousel = reducedMotion || liteMode;
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    const active = spotlightAnime?.[current];
    onActivePosterChange?.(active?.poster);
  }, [current, spotlightAnime, onActivePosterChange]);

  useEffect(() => {
    if (!api || !spotlightAnime?.length || pauseCarousel) return;
    const root = document.querySelector(".home-hero-carousel");
    if (!root || typeof IntersectionObserver === "undefined") {
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") api.scrollNext();
      }, 8000);
      return () => clearInterval(timer);
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (timer) clearInterval(timer);
        timer = null;
        if (!entry?.isIntersecting) return;
        timer = setInterval(() => {
          if (document.visibilityState === "visible") api.scrollNext();
        }, 8000);
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [api, spotlightAnime?.length, pauseCarousel]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="home-hero-carousel group/spotlight relative w-full overflow-hidden pointer-events-none">
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

      {spotlightAnime.length > 1 ? (
        <div className="hidden pointer-events-auto md:flex items-center gap-2.5 absolute right-4 md:right-8 bottom-24 z-30">
          <Button
            onClick={() => api?.scrollPrev()}
            aria-label={t("home.heroPreviousSlide")}
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground bg-white/10 hover:bg-white/15 backdrop-blur-sm border-0"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Button>
          <Button
            onClick={() => api?.scrollNext()}
            aria-label={t("home.heroNextSlide")}
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground bg-white/10 hover:bg-white/15 backdrop-blur-sm border-0"
          >
            <ArrowRight className="h-[18px] w-[18px]" />
          </Button>
        </div>
      ) : null}
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
    <div className="relative w-full max-h-[45lvh] sm:max-h-[70lvh] min-h-[40lvh] aspect-video overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        {isNearActive && anime?.poster ? (
          <Image
            src={anime.poster}
            alt=""
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover object-center scale-110"
          />
        ) : null}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent dark:from-[#0a0a0f] dark:via-[#0a0a0f]/50 z-10" />

      <div className="absolute inset-0 z-20 flex items-end">
        <Container className="w-full pb-16 sm:pb-20 pointer-events-none">
          <div className="flex w-full flex-col gap-3 md:gap-4 max-w-full">
            <ButtonLink
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="pointer-events-auto text-2xl lg:text-3xl font-extrabold line-clamp-2 hover:opacity-80 w-fit max-w-full xl:max-w-[40%] text-foreground dark:text-white"
            >
              {anime.name}
            </ButtonLink>

            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium pointer-events-none">
              <span className="py-1 px-3 text-muted-foreground text-xs home-glass-pill">{formatAnimeType(anime.type)}</span>
              {anime.otherInfo?.slice(0, 3).map((info, i) => (
                <span key={i} className="py-1 px-3 text-muted-foreground text-xs home-glass-pill">
                  {info}
                </span>
              ))}
            </div>

            <p className="select-text hidden sm:line-clamp-2 text-muted-foreground text-sm xl:max-w-[60%] pointer-events-auto">
              {stripHtml(anime?.description ?? "")}
            </p>

            <div className="flex items-center gap-x-2 text-sm pointer-events-auto">
              <ButtonLink
                href={`${ROUTES.WATCH}?anime=${anime.id}`}
                onClick={() => trackEvent("home_hero_watch", { anime_id: anime.id })}
                className="flex items-center h-9 px-6 font-semibold gap-2 text-sm justify-center bg-primary text-primary-foreground hover:brightness-110 rounded-full shadow-lg shadow-primary/20"
              >
                <Play className="h-4 w-4 fill-current" />
                {t("home.watchNow")}
              </ButtonLink>
              <ButtonLink
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="size-9 flex items-center justify-center rounded-full home-glass-pill hover:bg-white/15"
                aria-label={t("home.details")}
              >
                <Info className="h-4 w-4" />
              </ButtonLink>
              <button
                type="button"
                className="size-9 flex items-center justify-center rounded-full home-glass-pill hover:bg-white/15 pointer-events-auto"
                aria-label={t("anime.addToList")}
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="relative w-full min-h-[40lvh] max-h-[45lvh] sm:max-h-[70lvh] bg-black">
    <Container className="absolute inset-x-0 bottom-16 flex flex-col gap-4">
      <div className="h-10 w-4/5 max-w-lg animate-pulse bg-white/10 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-7 w-20 animate-pulse bg-white/10 rounded-full" />
        <div className="h-7 w-24 animate-pulse bg-white/10 rounded-full" />
      </div>
      <div className="h-11 w-36 animate-pulse bg-primary/30 rounded-full" />
    </Container>
  </div>
);

export default HeroSection;
