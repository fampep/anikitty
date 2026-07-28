"use client";

import { useRef } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/container";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import {
  formatAnimeType,
  formatCountdown,
  formatShortDate,
  HomePosterSkeletonRail,
  HomeRailArrows,
  HomeRailEmpty,
  HomeScrollRail,
  HomeSectionLink,
  useHomeRailScroll,
} from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

export default function HomeUpcomingRail({ animes, loading }: Props) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark } = useBookMarks({ populate: false });

  const remind = async (anime: IAnime) => {
    if (!auth) {
      toast.error(t("home.signInToContinue"));
      return;
    }
    const result = await createOrUpdateBookMark(
      String(anime.id),
      anime.name ?? "",
      anime.poster ?? "",
      "plan to watch",
      false,
      { anilistId: Number(anime.id) || undefined },
    );
    if (result) toast.success(t("home.reminderSet"));
    else toast.error(t("anime.listError"));
  };

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-36 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail count={4} />
      </Container>
    );
  }

  if (!animes.length) {
    return (
      <Container className="flex flex-col gap-4">
        <HomeSectionLink href={`${ROUTES.SEARCH}?status=NOT_YET_RELEASED`} title={t("home.upcomingAnime")} />
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      </Container>
    );
  }

  return (
    <Container id="upcoming" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={`${ROUTES.SEARCH}?status=NOT_YET_RELEASED`}
        title={t("home.upcomingAnime")}
        subtitle={t("home.upcomingAnimeDesc")}
        icon={<CalendarClock className="w-4 h-4" />}
        compact
        actions={
          <HomeRailArrows
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onLeft={() => scrollByDir("left")}
            onRight={() => scrollByDir("right")}
          />
        }
      />
      <HomeScrollRail scrollRef={scrollRef} className="gap-4 sm:gap-x-6">
        {animes.slice(0, 12).map((anime) => {
          const countdown = formatCountdown(anime.airingAt);
          const release = formatShortDate(anime.startDate) ?? (anime.year ? String(anime.year) : null);
          return (
            <div
              key={anime.id}
              className="home-glass-card flex gap-2 shrink-0 w-[90%] xs:w-[80%] md:w-1/2 lg:w-[45%] xl:w-[35%] 2xl:w-1/3 h-56 xl:h-60 p-2 overflow-hidden"
            >
              <Link
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="flex h-full aspect-[1/1.4] shrink-0 bg-white/5 relative rounded-xl overflow-hidden"
                draggable={false}
              >
                <LazyPosterImage src={anime.poster} alt={anime.name} sizes="200px" imageClassName="object-cover" />
                <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 to-transparent">
                  <span className="line-clamp-2 text-xs leading-tight font-semibold text-white">{anime.name}</span>
                </div>
              </Link>
              <div className="flex overflow-hidden flex-col gap-2 font-medium px-3 py-2 min-w-0 flex-1">
                <div className="flex flex-col text-muted-foreground text-xs gap-0.5">
                  <span className="text-[11px] uppercase tracking-wide">{t("home.comingSoon")}</span>
                  {release ? <span className="font-bold text-base text-foreground">{release}</span> : null}
                  {countdown ? (
                    <span className="text-amber-300/90 font-semibold tabular-nums">
                      {t("home.countdownIn", { time: countdown })}
                    </span>
                  ) : null}
                  <span className="mt-0.5">{formatAnimeType(anime.type)}</span>
                  {anime.studio ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clapperboard className="h-3 w-3" aria-hidden />
                      <span className="truncate">{anime.studio}</span>
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void remind(anime)}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border dark:border-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors site-focus"
                >
                  <Bell className="h-3.5 w-3.5" />
                  {t("home.remindMe")}
                </button>
              </div>
            </div>
          );
        })}
      </HomeScrollRail>
    </Container>
  );
}
