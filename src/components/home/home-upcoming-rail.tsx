"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { formatAnimeType, HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

export default function HomeUpcomingRail({ animes, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-4">
        <div className="h-7 w-36 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[85%] md:w-1/2 h-60 rounded-xl bg-muted/30 dark:bg-white/6 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (!animes.length && !loading) {
    return (
      <Container className="flex flex-col gap-4">
        <HomeSectionLink href={`${ROUTES.SEARCH}?status=NOT_YET_RELEASED`} title={t("home.topUpcoming")} />
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-4">
      <HomeSectionLink href={`${ROUTES.SEARCH}?status=NOT_YET_RELEASED`} title={t("home.topUpcoming")} />
      <HomeScrollRail className="gap-4 sm:gap-x-6">
        {animes.slice(0, 12).map((anime) => (
          <Link
            key={anime.id}
            href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
            className="home-glass-card flex gap-2 shrink-0 w-[90%] xs:w-[80%] md:w-1/2 lg:w-[45%] xl:w-[35%] 2xl:w-1/3 h-56 xl:h-60 p-2 overflow-hidden"
            draggable={false}
          >
            <div className="flex h-full aspect-[1/1.4] shrink-0 bg-white/5 relative rounded-xl overflow-hidden">
              <LazyPosterImage src={anime.poster} alt={anime.name} sizes="200px" imageClassName="object-cover" />
              <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/90 to-transparent">
                <span className="line-clamp-2 text-xs leading-tight font-semibold text-white">{anime.name}</span>
              </div>
            </div>
            <div className="flex overflow-hidden flex-col gap-2 font-medium px-3 py-2 min-w-0 flex-1">
              <div className="flex flex-col text-muted-foreground text-xs">
                <span className="text-[11px]">{t("home.comingSoon")}</span>
                {anime.year ? <span className="font-bold text-base text-foreground">{anime.year}</span> : null}
                <span className="mt-0.5">{formatAnimeType(anime.type)}</span>
              </div>
              {anime.score ? (
                <p className="text-xs text-muted-foreground mt-auto tabular-nums">
                  ★ {(anime.score / 10).toFixed(1)}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </HomeScrollRail>
    </Container>
  );
}
