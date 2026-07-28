"use client";

import { useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Play, Star } from "lucide-react";
import Container from "@/components/layout/container";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import {
  formatAnimeType,
  formatShortDate,
  HomePosterSkeletonRail,
  HomeRailArrows,
  HomeRailEmpty,
  HomeScrollRail,
  HomeSectionLink,
  scoreLabel,
  useHomeRailScroll,
} from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

export default function HomeJustCompleted({ animes, loading }: Props) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-40 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <HomePosterSkeletonRail count={5} />
      </Container>
    );
  }

  if (!animes.length) {
    return (
      <Container className="flex flex-col gap-3">
        <HomeSectionLink
          href={`${ROUTES.SEARCH}?status=FINISHED`}
          title={t("home.justCompleted")}
          icon={<CheckCircle2 className="w-4 h-4" />}
          compact
        />
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      </Container>
    );
  }

  return (
    <Container id="completed" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={`${ROUTES.SEARCH}?status=FINISHED`}
        title={t("home.justCompleted")}
        subtitle={t("home.justCompletedDesc")}
        icon={<CheckCircle2 className="w-4 h-4" />}
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
      <HomeScrollRail scrollRef={scrollRef}>
        {animes.map((anime) => {
          const rating = scoreLabel(anime.score);
          const finalEp = anime.episodes?.sub ?? anime.episodes?.dub;
          const completed = formatShortDate(anime.endDate) ?? anime.year;
          return (
            <div
              key={anime.id}
              className="home-glass-card flex flex-col gap-2 shrink-0 w-[9.5rem] md:w-40 overflow-hidden"
            >
              <div className="relative aspect-[1/1.4] rounded-xl overflow-hidden bg-white/10">
                <LazyPosterImage src={anime.poster} alt={anime.name} sizes="160px" imageClassName="object-cover" />
                {rating ? (
                  <span className="absolute right-1 top-1 z-10 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-1 text-xs font-medium">
                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" aria-hidden />
                    {rating}
                  </span>
                ) : null}
                {finalEp ? (
                  <span className="absolute left-1 bottom-1 z-10 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold">
                    {t("home.finalEp", { n: finalEp })}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-1 min-w-0 px-0.5">
                <p className="line-clamp-2 text-xs md:text-sm font-medium leading-snug">{anime.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {formatAnimeType(anime.type)}
                  {completed ? ` · ${completed}` : ""}
                </p>
                <Link
                  href={`${ROUTES.WATCH}?anime=${anime.id}`}
                  className="mt-1 inline-flex items-center justify-center gap-1 rounded-lg bg-foreground text-background dark:bg-white dark:text-black px-2 py-1.5 text-[11px] font-bold hover:opacity-90 transition-opacity"
                >
                  <Play className="h-3 w-3 fill-current" />
                  {t("home.watchNow")}
                </Link>
              </div>
            </div>
          );
        })}
      </HomeScrollRail>
    </Container>
  );
}
