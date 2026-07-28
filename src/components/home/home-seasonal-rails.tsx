"use client";

import { CalendarRange, Sparkles } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import {
  seasonLabel,
  seasonSearchParams,
  type AniListSeason,
} from "@/lib/home/season";
import HomeCompactPoster from "./home-compact-poster";
import { HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type SeasonMeta = { season: string; year: number } | undefined;

type Props = {
  currentAnimes: IAnime[];
  nextAnimes?: IAnime[];
  currentMeta?: SeasonMeta;
  nextMeta?: SeasonMeta;
  loading?: boolean;
};

function seasonHref(meta?: SeasonMeta) {
  if (!meta?.season || !meta?.year) return ROUTES.SEARCH;
  return `${ROUTES.SEARCH}?${seasonSearchParams(meta.season as AniListSeason, meta.year)}`;
}

function seasonTitle(meta: SeasonMeta, fallback: string) {
  if (!meta?.season || !meta?.year) return fallback;
  return `${seasonLabel(meta.season as AniListSeason)} ${meta.year}`;
}

export default function HomeSeasonalRails({
  currentAnimes,
  nextAnimes = [],
  currentMeta,
  nextMeta,
  loading,
}: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-6 py-2">
        <div className="h-7 w-48 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 aspect-[1/1.4] rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <div id="seasonal" className="flex flex-col gap-[var(--home-section-gap)] scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <Container className="flex flex-col gap-3">
        <HomeSectionLink
          href={seasonHref(currentMeta)}
          title={t("home.thisSeasonNamed", {
            season: seasonTitle(currentMeta, t("home.thisSeason")),
          })}
          icon={<CalendarRange className="w-4 h-4" />}
          compact
        />
        {currentAnimes.length ? (
          <HomeScrollRail>
            {currentAnimes.map((anime) => (
              <HomeCompactPoster key={anime.id} anime={anime} />
            ))}
          </HomeScrollRail>
        ) : (
          <HomeRailEmpty message={t("home.sectionEmpty")} />
        )}
      </Container>

      {nextAnimes.length > 0 ? (
        <Container className="flex flex-col gap-3">
          <HomeSectionLink
            href={seasonHref(nextMeta)}
            title={t("home.upcomingSeasonNamed", {
              season: seasonTitle(nextMeta, t("home.topUpcoming")),
            })}
            icon={<Sparkles className="w-4 h-4" />}
            compact
          />
          <HomeScrollRail>
            {nextAnimes.map((anime) => (
              <HomeCompactPoster key={anime.id} anime={anime} />
            ))}
          </HomeScrollRail>
        </Container>
      ) : null}
    </div>
  );
}
