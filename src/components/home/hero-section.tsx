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
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Clapperboard,
  Info,
  Play,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/core/utils";
import { formatAnimeType } from "./home-shared";
import AnimeClearLogo from "@/components/anime/anime-clear-logo";
import { pickAnimeClearLogo } from "@/lib/anime/anime-logo";
import { useGetAnimeMappings } from "@/query/anime/get-anime-mappings";
import { accountContinue } from "@/lib/oauth/account";
import { useProgressStore } from "@/store/progress-store";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isNearSlide(index: number, current: number, total: number): boolean {
  if (total <= 1) return true;
  const diff = Math.abs(index - current);
  return diff <= 1 || diff === total - 1;
}

function formatStatus(status?: string | null): string | null {
  if (!status) return null;
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ContinueHint = { episodeId: string; current: number } | null;

type IHeroSectionProps = {
  spotlightAnime: SpotlightAnime[];
  isDataLoading: boolean;
  onActivePosterChange?: (poster: string | undefined) => void;
};

const HeroSection = ({ spotlightAnime, isDataLoading, onActivePosterChange }: IHeroSectionProps) => {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const pauseCarousel = reducedMotion;
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const { auth } = useAuthStore();
  const [continueById, setContinueById] = useState<Record<string, ContinueHint>>({});

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
    if (!auth?.id || !spotlightAnime?.length) return;
    let cancelled = false;
    const getProgress = useProgressStore.getState().getProgress;
    accountContinue
      .get(true, 20)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, ContinueHint> = {};
        for (const row of res?.data ?? []) {
          const animeId = String(row.animeId ?? "");
          if (!animeId) continue;
          const episodeId = String(row.episodeId ?? "");
          const cached = getProgress(animeId, episodeId);
          map[animeId] = {
            episodeId,
            current: cached?.current ?? row.currentTime ?? 0,
          };
        }
        setContinueById(map);
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.id, spotlightAnime?.length]);

  useEffect(() => {
    if (!api || !spotlightAnime?.length || pauseCarousel) return;
    const root = document.querySelector(".home-hero-carousel");
    if (!root) {
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") api.scrollNext();
      }, 9000);
      return () => clearInterval(timer);
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    let hovering = false;

    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (document.visibilityState === "visible" && !hovering) api.scrollNext();
      }, 9000);
    };

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onEnter = () => {
      hovering = true;
      stop();
    };
    const onLeave = () => {
      hovering = false;
      if (root.getAttribute("data-in-view") === "1") start();
    };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = Boolean(entry?.isIntersecting);
        root.setAttribute("data-in-view", inView ? "1" : "0");
        stop();
        if (inView && !hovering) start();
      },
      { threshold: 0.25 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      stop();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [api, spotlightAnime?.length, pauseCarousel]);

  if (isDataLoading) return <LoadingSkeleton />;

  return (
    <div className="home-hero-carousel group/spotlight relative w-full overflow-hidden pointer-events-auto">
      <Carousel className="w-full h-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="h-full">
          {spotlightAnime?.map((anime, index) => (
            <CarouselItem key={anime.id ?? index} className="h-full">
              <HeroCarouselItem
                anime={anime}
                isNearActive={isNearSlide(index, current, spotlightAnime.length)}
                isActive={index === current}
                priority={index === 0}
                continueHint={continueById[anime.id] ?? null}
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
  isActive,
  priority = false,
  continueHint,
}: {
  anime: SpotlightAnime;
  isNearActive: boolean;
  isActive: boolean;
  priority?: boolean;
  continueHint: ContinueHint;
}) => {
  const t = useT();
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark } = useBookMarks({ populate: false });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const anilistId = Number(anime.id);
  const { data: mappingData } = useGetAnimeMappings(
    Number.isFinite(anilistId) ? anilistId : undefined,
    isActive,
  );
  const logoUrl = pickAnimeClearLogo(mappingData?.images);

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
      anime.cover ?? anime.poster ?? "",
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

  const epCount = anime.episodes?.sub ?? anime.episodes?.dub;
  const statusLabel = formatStatus(anime.status);
  const scoreLabel =
    anime.score != null && anime.score > 0 ? (anime.score / 10).toFixed(1) : null;
  const watchHref = continueHint
    ? `${ROUTES.WATCH}?anime=${anime.id}&episode=${continueHint.episodeId}${
        continueHint.current > 10 ? `&t=${Math.floor(continueHint.current)}` : ""
      }`
    : `${ROUTES.WATCH}?anime=${anime.id}`;

  return (
    <div className="home-hero-slide relative w-full min-h-[64lvh] sm:min-h-[66lvh] lg:min-h-[70lvh] overflow-hidden bg-black">
      <div className="absolute inset-0 overflow-hidden">
        {isNearActive && anime?.poster ? (
          <Image
            src={anime.poster}
            alt=""
            fill
            priority={priority}
            sizes="100vw"
            className="object-cover object-center scale-[1.03]"
          />
        ) : null}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent dark:from-black/80 dark:via-black/25 z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/72 via-background/12 to-transparent dark:from-black/68 dark:via-black/10 z-10" />

      <div className="absolute inset-0 z-20 flex items-end">
        <Container className="w-full pb-16 sm:pb-20 pointer-events-none">
          <div className="flex w-full flex-col gap-3 md:gap-4 max-w-full xl:max-w-[52%]">
            <AnimeClearLogo
              name={anime.name}
              logoUrl={logoUrl}
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              size="lg"
              className="pointer-events-auto"
            />

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm pointer-events-none">
              <span className="text-[10px] font-mono text-muted-foreground dark:text-white/45 uppercase tracking-[0.2em]">
                {formatAnimeType(anime.type)}
              </span>
              {scoreLabel ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200/90">
                  <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" aria-hidden />
                  {scoreLabel}
                </span>
              ) : null}
              {anime.year ? (
                <span className="text-xs text-muted-foreground dark:text-white/45 font-mono">{anime.year}</span>
              ) : null}
              {statusLabel ? (
                <span className="text-xs text-muted-foreground dark:text-white/45 font-mono">{statusLabel}</span>
              ) : null}
              {epCount ? (
                <span className="text-xs text-muted-foreground dark:text-white/45 font-mono">
                  {t("common.ep")} {epCount}
                </span>
              ) : null}
              {anime.studio ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground dark:text-white/45">
                  <Clapperboard className="h-3 w-3" aria-hidden />
                  {anime.studio}
                </span>
              ) : null}
            </div>

            {anime.genres?.length ? (
              <div className="flex flex-wrap gap-1.5 pointer-events-auto">
                {anime.genres.slice(0, 4).map((genre) => (
                  <Link
                    key={genre}
                    href={`${ROUTES.SEARCH}?genres=${encodeURIComponent(genre.toLowerCase().replace(/\s+/g, "-"))}`}
                    className="rounded-md border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70 hover:text-white hover:border-white/30 transition-colors"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            ) : null}

            <p className="select-text hidden sm:line-clamp-2 text-muted-foreground text-sm pointer-events-auto">
              {stripHtml(anime?.description ?? "")}
            </p>

            {anime.voiceActors?.length ? (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground dark:text-white/45 pointer-events-auto">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {anime.voiceActors.map((va) => va.name).filter(Boolean).join(" · ")}
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-x-2 text-sm pointer-events-auto">
              <Link
                href={watchHref}
                onClick={() =>
                  trackEvent(continueHint ? "home_hero_continue" : "home_hero_watch", {
                    anime_id: anime.id,
                  })
                }
                className="inline-flex items-center h-9 px-6 font-semibold gap-2 text-sm justify-center bg-white text-black hover:bg-white/90 rounded-full"
              >
                <Play className="h-4 w-4 fill-current" />
                {continueHint ? t("home.continueWatching") : t("home.watchNow")}
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
                    ? "text-zinc-300 hover:text-zinc-200 hover:bg-white/10"
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
