"use client";

import { useMemo, useState } from "react";
import { Flame, Heart, Star } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import HomeCompactPoster from "./home-compact-poster";
import { HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type TabId = "trending" | "popular" | "rated";

type Props = {
  trending: IAnime[];
  popular?: IAnime[];
  rated?: IAnime[];
  loading?: boolean;
};

const TABS: { id: TabId; icon: typeof Flame; labelKey: "trendingNow" | "mostPopular" | "topRated" }[] = [
  { id: "trending", icon: Flame, labelKey: "trendingNow" },
  { id: "popular", icon: Heart, labelKey: "mostPopular" },
  { id: "rated", icon: Star, labelKey: "topRated" },
];

export default function HomeTrendingRail({ trending, popular = [], rated = [], loading }: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("trending");

  const lists = useMemo(
    () => ({
      trending,
      popular: popular.length ? popular : trending,
      rated: rated.length ? rated : trending,
    }),
    [trending, popular, rated],
  );

  const active = lists[tab];
  const visibleTabs = TABS.filter(({ id }) => lists[id].length > 0 || loading);

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-40 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 aspect-[1/1.4] rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <Container id="trending" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <HomeSectionLink
            href={ROUTES.TRENDING}
            title={t("home.trendingNow")}
            icon={<Flame className="w-4 h-4" />}
            compact
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-momentum shrink-0">
          {visibleTabs.map(({ id, icon: Icon, labelKey }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={selected}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-colors",
                  selected
                    ? "bg-foreground text-background dark:bg-white dark:text-black"
                    : "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
                )}
              >
                <Icon className="w-3 h-3" aria-hidden />
                {t(`home.${labelKey}`)}
              </button>
            );
          })}
        </div>
      </div>

      {active.length ? (
        <HomeScrollRail>
          {active.map((anime, i) => (
            <HomeCompactPoster
              key={`${tab}-${anime.id}`}
              anime={anime}
              rank={i + 1}
              onPrefetch={() => {
                try {
                  void fetch(`/api/anime/${anime.id}`, { priority: "low" } as RequestInit);
                } catch {
                  /* ignore */
                }
              }}
            />
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
