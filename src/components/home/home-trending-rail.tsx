"use client";

import { Flame } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import HomeCompactPoster from "./home-compact-poster";
import { HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

export default function HomeTrendingRail({ animes, loading }: Props) {
  const t = useT();

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
      <HomeSectionLink
        href={ROUTES.TRENDING}
        title={t("home.trendingNow")}
        icon={<Flame className="w-4 h-4" />}
        compact
      />
      {animes.length ? (
        <HomeScrollRail>
          {animes.map((anime, i) => (
            <HomeCompactPoster key={anime.id} anime={anime} priority={i < 4} />
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
