"use client";

import { useRef } from "react";
import { PackagePlus } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import HomeCompactPoster from "./home-compact-poster";
import {
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

export default function HomeRecentlyAdded({ animes, loading }: Props) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-40 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail />
      </Container>
    );
  }

  return (
    <Container id="recently-added" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={`${ROUTES.SEARCH}?sort=recently-added`}
        title={t("home.newReleases")}
        subtitle={t("home.newReleasesDesc")}
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
      {animes.length ? (
        <HomeScrollRail scrollRef={scrollRef}>
          {animes.map((anime) => (
            <HomeCompactPoster key={anime.id} anime={anime} />
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
