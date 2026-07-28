"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Clapperboard, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import Container from "@/components/layout/container";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { cn } from "@/lib/core/utils";
import HomeCompactPoster from "./home-compact-poster";
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

type TabId = "new" | "upcoming";

type Props = {
  recentlyAdded: IAnime[];
  upcoming: IAnime[];
  loading?: boolean;
};

export default function HomeNewUpcoming({ recentlyAdded, upcoming, loading }: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("new");
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

  const seeAllHref =
    tab === "new"
      ? `${ROUTES.SEARCH}?sort=recently-added`
      : `${ROUTES.SEARCH}?status=NOT_YET_RELEASED`;

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-44 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail />
      </Container>
    );
  }

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "new", label: t("home.newReleases"), count: recentlyAdded.length },
    { id: "upcoming", label: t("home.upcomingAnime"), count: upcoming.length },
  ];

  return (
    <Container id="new-upcoming" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={seeAllHref}
        title={t("home.newAndUpcoming")}
        subtitle={t("home.newAndUpcomingDesc")}
        icon={<PackagePlus className="w-4 h-4" />}
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

      <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-momentum">
        {tabs.map(({ id, label, count }) => {
          const selected = tab === id;
          const disabled = count === 0;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => setTab(id)}
              aria-pressed={selected}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-colors disabled:opacity-30",
                selected
                  ? "bg-foreground text-background dark:bg-white dark:text-black"
                  : "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
              )}
            >
              {id === "upcoming" ? <CalendarClock className="w-3 h-3" aria-hidden /> : null}
              {label}
            </button>
          );
        })}
      </div>

      {tab === "new" ? (
        recentlyAdded.length ? (
          <HomeScrollRail scrollRef={scrollRef}>
            {recentlyAdded.map((anime) => (
              <HomeCompactPoster key={anime.id} anime={anime} />
            ))}
          </HomeScrollRail>
        ) : (
          <HomeRailEmpty message={t("home.sectionEmpty")} />
        )
      ) : upcoming.length ? (
        <HomeScrollRail scrollRef={scrollRef} className="gap-4 sm:gap-x-6">
          {upcoming.slice(0, 12).map((anime) => {
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
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
