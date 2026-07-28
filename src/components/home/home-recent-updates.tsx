"use client";

import { useMemo, useRef, useState } from "react";
import { Tv2 } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { getAnimeProgressEntries } from "@/store/progress-store";
import HomeCompactPoster from "./home-compact-poster";
import {
  HomePosterSkeletonRail,
  HomeRailArrows,
  HomeRailEmpty,
  HomeScrollRail,
  HomeSectionLink,
  useHomeRailScroll,
} from "./home-shared";

type AudioTab = "all" | "sub" | "dub";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

function progressPctFor(animeId: string): number | null {
  const entries = getAnimeProgressEntries(animeId);
  if (!entries.length) return null;
  const best = entries.reduce((a, b) => (a.current / Math.max(1, a.duration) > b.current / Math.max(1, b.duration) ? a : b));
  if (!best.duration) return null;
  return Math.round((best.current / best.duration) * 100);
}

export default function HomeRecentUpdates({ animes, loading }: Props) {
  const t = useT();
  const [tab, setTab] = useState<AudioTab>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);

  const lists = useMemo(() => {
    const sub = animes.filter((a) => (a.episodes?.sub ?? 0) > 0);
    const dub = animes.filter((a) => (a.episodes?.dub ?? 0) > 0);
    return { all: animes, sub, dub };
  }, [animes]);

  const active = lists[tab];
  const tabs: { id: AudioTab; label: string; count: number }[] = [
    { id: "all", label: t("home.tabAll"), count: lists.all.length },
    { id: "sub", label: t("home.tabSub"), count: lists.sub.length },
    { id: "dub", label: t("home.tabDub"), count: lists.dub.length },
  ];

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-44 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail />
      </Container>
    );
  }

  return (
    <Container id="new-episodes" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.NEW}
        title={t("home.latestEpisodes")}
        subtitle={t("home.latestEpisodesDesc")}
        icon={<Tv2 className="w-4 h-4" />}
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
          const disabled = count === 0 && id !== "all";
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
              {label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {active.length ? (
        <HomeScrollRail scrollRef={scrollRef}>
          {active.map((anime, i) => {
            const ep = anime.episodes?.sub ?? anime.episodes?.dub ?? 1;
            return (
              <HomeCompactPoster
                key={`${tab}-${anime.id}`}
                anime={anime}
                episodeBadge={ep}
                showNew={i < 3}
                progressPct={progressPctFor(anime.id)}
                href={`${ROUTES.WATCH}?anime=${anime.id}&type=latest`}
                watchHref={`${ROUTES.WATCH}?anime=${anime.id}&type=latest`}
              />
            );
          })}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
