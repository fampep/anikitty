"use client";

import { useMemo, useState } from "react";
import { Flame, Star, TrendingUp } from "lucide-react";
import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type TabId = "season" | "popular" | "rated";

type Props = {
  seasonAnimes: IAnime[];
  popularAnimes: IAnime[];
  ratedAnimes: IAnime[];
  loading?: boolean;
};

const TABS: { id: TabId; icon: typeof TrendingUp; labelKey: "thisSeason" | "allTimePopular" | "topRated" }[] = [
  { id: "season", icon: TrendingUp, labelKey: "thisSeason" },
  { id: "popular", icon: Flame, labelKey: "allTimePopular" },
  { id: "rated", icon: Star, labelKey: "topRated" },
];

export default function HomeSeasonBrowser({ seasonAnimes, popularAnimes, ratedAnimes, loading }: Props) {
  const t = useT();
  const [tab, setTab] = useState<TabId>("season");

  const activeList = useMemo(() => {
    if (tab === "popular") return popularAnimes;
    if (tab === "rated") return ratedAnimes;
    return seasonAnimes;
  }, [tab, seasonAnimes, popularAnimes, ratedAnimes]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[1/1.4] rounded-xl bg-muted/30 dark:bg-white/6 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 xl:gap-8 w-full">
      <div className="grid grid-cols-3 w-full gap-2 lg:gap-4">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "text-center flex items-center justify-center gap-1 shrink-0 text-nowrap text-sm lg:text-base h-9 rounded-xl transition-all",
                active
                  ? "bg-foreground text-background font-semibold dark:bg-white dark:text-black"
                  : "text-muted-foreground font-medium hover:text-foreground dark:hover:text-white/80 transition-colors",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              <span className="truncate">{t(`home.${labelKey}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid w-full gap-4 sm:gap-6 xl:gap-8 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6">
        {activeList.slice(0, 18).map((anime, idx) => (
          <AnimeCard
            key={anime.id ?? idx}
            title={anime.name}
            subTitle={anime.type}
            poster={anime.poster}
            className="w-full"
            href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
            episodeCard
            sub={anime.episodes?.sub}
            dub={anime.episodes?.dub}
            score={anime.score}
            year={anime.year}
            status={anime.status}
            deferImage={idx > 5}
          />
        ))}
      </div>
    </div>
  );
}
