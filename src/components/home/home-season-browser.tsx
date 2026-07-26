"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Compass, Flame, Star, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import HomeClassicCard from "./home-classic-card";
import { HomeSectionLink } from "./home-shared";

type TabId = "season" | "popular" | "rated" | "upcoming";

type Props = {
  seasonAnimes: IAnime[];
  popularAnimes: IAnime[];
  ratedAnimes: IAnime[];
  upcomingAnimes?: IAnime[];
  loading?: boolean;
};

const PAGE_SIZE = 8;

const TABS: { id: TabId; icon: typeof TrendingUp; labelKey: "thisSeason" | "allTimePopular" | "topRated" | "topUpcoming" }[] = [
  { id: "season", icon: TrendingUp, labelKey: "thisSeason" },
  { id: "popular", icon: Flame, labelKey: "allTimePopular" },
  { id: "rated", icon: Star, labelKey: "topRated" },
  { id: "upcoming", icon: Clock, labelKey: "topUpcoming" },
];

export default function HomeSeasonBrowser({
  seasonAnimes,
  popularAnimes,
  ratedAnimes,
  upcomingAnimes = [],
  loading,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("season");
  const [page, setPage] = useState(1);

  const lists = useMemo(
    () => ({
      season: seasonAnimes,
      popular: popularAnimes,
      rated: ratedAnimes,
      upcoming: upcomingAnimes,
    }),
    [seasonAnimes, popularAnimes, ratedAnimes, upcomingAnimes],
  );

  const activeList = lists[tab];
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const visibleTabs = useMemo(
    () => TABS.filter(({ id }) => lists[id].length > 0 || loading),
    [lists, loading],
  );

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some(({ id }) => id === tab)) {
      setTab(visibleTabs[0].id);
    }
  }, [tab, visibleTabs]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = activeList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-28 shrink-0 rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
        <div className="home-classic-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-muted/30 dark:bg-white/6 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="discover" className="flex flex-col gap-3 w-full scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.SEARCH}
        title={t("home.discover")}
        icon={<Compass className="w-4 h-4" />}
        compact
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-momentum flex-1 min-w-0">
          {visibleTabs.map(({ id, icon: Icon, labelKey }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all",
                  active
                    ? "bg-foreground text-background dark:bg-white dark:text-black"
                    : "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {t(`home.${labelKey}`).toUpperCase()}
              </button>
            );
          })}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label={t("common.previous")}
              className="h-8 w-8 rounded-lg border border-border dark:border-white/10 flex items-center justify-center text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/80 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="sr-only" htmlFor="home-discover-page">
              {t("home.pageNumber")}
            </label>
            <input
              id="home-discover-page"
              readOnly
              value={page}
              title={t("home.pageNumber")}
              className="h-8 w-10 rounded-lg border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.04] text-center text-xs font-bold tabular-nums text-foreground dark:text-white/80"
            />
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label={t("common.next")}
              className="h-8 w-8 rounded-lg border border-border dark:border-white/10 flex items-center justify-center text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/80 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {pageItems.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border dark:border-white/10 py-16 text-sm text-muted-foreground dark:text-white/40">
          {t("search.noResults")}
        </div>
      ) : (
        <div className="home-classic-grid">
          {pageItems.map((anime, idx) => (
            <HomeClassicCard key={anime.id ?? idx} anime={anime} />
          ))}
        </div>
      )}
    </div>
  );
}
