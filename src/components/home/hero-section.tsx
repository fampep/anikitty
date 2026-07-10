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
import { ArrowLeft, ArrowRight, Captions, Mic, Play, Info } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ButtonLink } from "@/components/common/button-link";
import { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings-store";
import { trackEvent } from "@/lib/analytics";

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
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const pauseCarousel = reducedMotion || liteMode;
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
    if (!api || !count || pauseCarousel) return;
    const root = document.querySelector(".home-hero-carousel");
    if (!root || typeof IntersectionObserver === "undefined") {
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") api.scrollNext();
      }, 7000);
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
        }, 7000);
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [api, count, pauseCarousel]);

  useEffect(() => {
    if (!api) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        api.scrollPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        api.scrollNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="home-hero-carousel min-h-[17.5rem] h-[max(42svh,17.5rem)] sm:h-[48vh] md:h-[52vh] max-h-[var(--home-hero-max-h,520px)] w-full relative overflow-hidden">
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

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background via-background/70 to-transparent dark:from-[#0a0a0f] dark:via-[#0a0a0f]/70 z-[15] pointer-events-none" />

      {/* Bottom controls row */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12">
        {/* Slide counter */}
        <span className="text-muted-foreground dark:text-white/30 text-xs font-mono tracking-widest hidden md:block">
          <span className="text-muted-foreground dark:text-white/70">{String(current + 1).padStart(2, "0")}</span>
          {" / "}
          {String(count).padStart(2, "0")}
        </span>

        {/* Progress bar indicators */}
        {count > 1 && (
          <div className="flex items-center gap-1 mx-auto md:mx-0 md:absolute md:left-1/2 md:-translate-x-1/2">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={t("home.heroGoToSlide", { n: i + 1 })}
                className="touch-target flex items-center justify-center px-1.5 py-3 -my-2"
              >
                <span
                  className={`block h-[3px] rounded-full overflow-hidden bg-white/20 hover:bg-muted/30 dark:bg-white/35 transition-all duration-300 ${
                    i === current ? "w-8" : "w-3"
                  }`}
                >
                  {i === current && !reducedMotion && (
                    <div
                      key={current}
                      className="h-full bg-white rounded-full"
                      style={{ animation: "progressBar 7s linear forwards", width: "0%" }}
                    />
                  )}
                  {i === current && reducedMotion && (
                    <div className="h-full w-full bg-white rounded-full" />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Nav arrows */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            onClick={() => api?.scrollPrev()}
            aria-label={t("home.heroPreviousSlide")}
            size="icon"
            className="rounded-full bg-black/40 border border-border dark:border-white/15 hover:bg-accent dark:hover:bg-white/10 hover:border-border dark:hover:border-white/30 backdrop-blur-sm h-9 w-9 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground dark:text-white/70" />
          </Button>
          <Button
            onClick={() => api?.scrollNext()}
            aria-label={t("home.heroNextSlide")}
            size="icon"
            className="rounded-full bg-black/40 border border-border dark:border-white/15 hover:bg-accent dark:hover:bg-white/10 hover:border-border dark:hover:border-white/30 backdrop-blur-sm h-9 w-9 transition-all"
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground dark:text-white/70" />
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
  <div className="w-full h-[42vh] sm:h-[48vh] md:h-[52vh] max-h-[var(--home-hero-max-h,520px)] relative overflow-hidden bg-black">
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
    <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background/90 dark:from-black/60 to-transparent z-10" />

    {/* Content */}
    <div className="absolute inset-0 z-20 flex items-end md:items-center pb-14 sm:pb-16 md:pb-0">
      <Container className="w-full">
        <div className="max-w-lg space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5">
            {anime.rank && (
              <span className="text-[11px] font-mono font-bold text-foreground/90 dark:text-white/80 bg-accent dark:bg-white/8 border border-border dark:border-white/15 px-2 py-0.5 rounded-md">
                #{anime.rank}
              </span>
            )}
            {anime.type && (
              <span className="text-[10px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-[0.2em]">
                {anime.type}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black leading-[1.05] text-foreground dark:text-white">
            {anime.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {anime.episodes?.sub != null && anime.episodes.sub > 0 && (
              <span className="inline-flex items-center gap-1 bg-accent dark:bg-white/10 text-foreground dark:text-white/90 border border-border dark:border-white/15 text-xs font-bold px-2.5 py-1 rounded-full">
                <Captions className="h-3 w-3" />
                SUB {anime.episodes.sub}
              </span>
            )}
            {anime.episodes?.dub != null && anime.episodes.dub > 0 && (
              <span className="inline-flex items-center gap-1 bg-accent dark:bg-white/10 text-foreground dark:text-white/90 border border-border dark:border-white/15 text-xs font-bold px-2.5 py-1 rounded-full">
                <Mic className="h-3 w-3" />
                DUB {anime.episodes.dub}
              </span>
            )}
            {anime.otherInfo?.slice(0, 3).map((info, i) => (
              <span key={i} className="text-xs text-muted-foreground dark:text-white/40 font-mono hidden sm:inline">
                {info}
              </span>
            ))}
          </div>

          <p className="text-sm md:text-[15px] text-muted-foreground dark:text-white/55 line-clamp-2 sm:line-clamp-3 leading-relaxed hidden xs:block">
            {stripHtml(anime?.description ?? "")}
          </p>

          <div className="w-12 h-px bg-white/20" />

          <div className="flex items-center gap-2 sm:gap-3">
            <ButtonLink
              href={`${ROUTES.WATCH}?anime=${anime.id}`}
              onClick={() => trackEvent("home_hero_watch", { anime_id: anime.id })}
              className="flex items-center gap-2 h-10 sm:h-11 bg-white text-black font-bold px-4 sm:px-6 rounded-xl hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-white/10 text-sm"
            >
              <Play className="h-4 w-4 fill-current" />
              {t("home.watchNow")}
            </ButtonLink>
            <ButtonLink
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="flex items-center gap-2 h-10 sm:h-11 bg-muted/50 border border-border text-foreground/90 hover:bg-accent hover:border-primary/40 px-4 sm:px-5 rounded-xl transition-all text-sm dark:bg-white/5 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/10 dark:hover:border-white/35"
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
  <div className="h-[42vh] sm:h-[48vh] md:h-[52vh] max-h-[var(--home-hero-max-h,520px)] w-full relative bg-black">
    <div className="absolute inset-0 flex items-end md:items-center pb-14 sm:pb-16 md:pb-0">
      <Container className="w-full">
        <div className="max-w-lg space-y-4">
          <div className="h-4 w-20 animate-pulse bg-accent dark:bg-white/10 rounded-md" />
          <div className="h-14 w-4/5 animate-pulse bg-accent dark:bg-white/10 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse bg-accent dark:bg-white/10 rounded-full" />
            <div className="h-7 w-20 animate-pulse bg-accent dark:bg-white/10 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full animate-pulse bg-muted/60 dark:bg-muted/60 dark:bg-white/6 rounded" />
            <div className="h-3.5 w-5/6 animate-pulse bg-muted/60 dark:bg-muted/60 dark:bg-white/6 rounded" />
            <div className="h-3.5 w-4/6 animate-pulse bg-muted/60 dark:bg-muted/60 dark:bg-white/6 rounded" />
          </div>
          <div className="w-12 h-px bg-accent dark:bg-white/10" />
          <div className="flex gap-3">
            <div className="h-11 w-36 animate-pulse bg-muted dark:bg-white/15 rounded-xl" />
            <div className="h-11 w-28 animate-pulse bg-accent dark:bg-white/8 rounded-xl" />
          </div>
        </div>
      </Container>
    </div>
  </div>
);

export default HeroSection;
