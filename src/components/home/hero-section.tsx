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
import Link from "next/link";

import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Info, Play } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/core/utils";
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
        <>
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

          <div className="pointer-events-auto flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8 bottom-16 md:bottom-14 z-30">
            {spotlightAnime.map((anime, index) => (
              <button
                key={anime.id ?? index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={t("home.heroGoToSlide", { n: index + 1 })}
                aria-current={index === current}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === current
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>
        </>
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
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark } = useBookMarks({ populate: false });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleBookmark = async () => {
    if (!auth) {
      toast.error(t("home.signInToContinue"));
      return;
    }
    if (saving || saved) return;
    setSaving(true);
    const result = await createOrUpdateBookMark(
      String(anime.id),
      anime.name ?? "",
      anime.poster ?? "",
      "plan to watch",
      false,
      { anilistId: Number(anime.id) || undefined },
    );
    setSaving(false);
    if (result) {
      setSaved(true);
      toast.success(t("anime.addedToPlanToWatch"));
    } else {
      toast.error(t("anime.listError"));
    }
  };

  return (
    <div className="relative w-full max-h-[var(--home-hero-max-h)] min-h-[42lvh] sm:min-h-[40lvh] aspect-video overflow-hidden bg-black">
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
            <Link
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="pointer-events-auto text-2xl lg:text-3xl font-extrabold line-clamp-2 hover:opacity-80 w-fit max-w-full xl:max-w-[40%] text-foreground dark:text-white"
            >
              {anime.name}
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm pointer-events-none">
              <span className="text-[10px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-[0.2em]">
                {formatAnimeType(anime.type)}
              </span>
              {anime.otherInfo?.slice(0, 3).map((info, i) => (
                <span key={i} className="text-xs text-muted-foreground dark:text-white/40 font-mono">
                  {info}
                </span>
              ))}
            </div>

            <p className="select-text hidden sm:line-clamp-2 text-muted-foreground text-sm xl:max-w-[60%] pointer-events-auto">
              {stripHtml(anime?.description ?? "")}
            </p>

            <div className="flex items-center gap-x-2 text-sm pointer-events-auto">
              <Link
                href={`${ROUTES.WATCH}?anime=${anime.id}`}
                onClick={() => trackEvent("home_hero_watch", { anime_id: anime.id })}
                className="inline-flex items-center h-9 px-6 font-semibold gap-2 text-sm justify-center bg-white text-black hover:bg-white/90 rounded-full"
              >
                <Play className="h-4 w-4 fill-current" />
                {t("home.watchNow")}
              </Link>
              <Link
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="size-9 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10"
                aria-label={t("home.details")}
              >
                <Info className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleBookmark}
                disabled={saving}
                className={cn(
                  "size-9 flex items-center justify-center rounded-full pointer-events-auto transition-colors disabled:opacity-60",
                  saved
                    ? "text-violet-300 hover:text-violet-200 hover:bg-white/10"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
                aria-label={saved ? t("anime.addedToPlanToWatch") : t("anime.addToList")}
                aria-pressed={saved}
              >
                <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
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
      <div className="h-11 w-36 animate-pulse bg-white/15 rounded-full" />
    </Container>
  </div>
);

export default HeroSection;
