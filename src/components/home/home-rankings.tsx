"use client";

import { useMemo, useRef, useState } from "react";
import { Flame, Heart, Star, Trophy } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import HomeCompactPoster from "./home-compact-poster";
import {
  HomePosterSkeletonRail,
  HomeRailArrows,
  HomeRailEmpty,
  HomeScrollRail,
  HomeSectionLink,
  useHomeRailScroll,
} from "./home-shared";

type TabId = "trending" | "popular" | "rated";

type Props = {
  trending: IAnime[];
  popular?: IAnime[];
  rated?: IAnime[];
  loading?: boolean;
};

const TABS: {
  id: TabId;
  icon: typeof Flame;
  labelKey: "rankingsTrending" | "rankingsPopular" | "rankingsRated";
  href: string;
}[] = [
  { id: "trending", icon: Flame, labelKey: "rankingsTrending", href: ROUTES.TRENDING },
  { id: "popular", icon: Heart, labelKey: "rankingsPopular", href: `${ROUTES.SEARCH}?sort=most-watched` },
  { id: "rated", icon: Star, labelKey: "rankingsRated", href: `${ROUTES.SEARCH}?sort=score` },
];

/**
 * Honest AniList-backed rankings. Day/Week/Month period charts are omitted
 * because this feed does not have real period snapshots.
 */
export default function HomeRankings({ trending, popular = [], rated = [], loading }: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("trending");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);

  const lists = useMemo(
    () => ({
      trending,
      popular: popular.length ? popular : trending,
      rated: rated.length ? rated : trending,
    }),
    [trending, popular, rated],
  );

  const active = lists[tab];
  const activeMeta = TABS.find((x) => x.id === tab) ?? TABS[0];

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-48 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail />
      </Container>
    );
  }

  return (
    <Container id="rankings" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={activeMeta.href}
        title={t("home.topRankings")}
        subtitle={t("home.topRankingsDesc")}
        icon={<Trophy className="w-4 h-4" />}
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
        {TABS.map(({ id, icon: Icon, labelKey }) => {
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

      {active.length ? (
        <HomeScrollRail scrollRef={scrollRef}>
          {active.map((anime, i) => (
            <HomeCompactPoster key={`${tab}-${anime.id}`} anime={anime} rank={i + 1} />
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
