"use client";

import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import HomeSideListRail from "./home-side-list-rail";

type Props = {
  latestCompleted: IAnime[];
  popular: IAnime[];
  upcoming: IAnime[];
  loading?: boolean;
};

function filterMovies(animes: IAnime[]) {
  return animes.filter((a) => String(a.type ?? "").toUpperCase() === "MOVIE");
}

export default function HomeSideLists({ latestCompleted, popular, upcoming, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="h-4 w-32 rounded bg-muted/40 dark:bg-white/8 animate-pulse" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="shrink-0 w-[17rem] h-36 rounded-xl bg-muted/30 dark:bg-white/6 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </Container>
    );
  }

  const topMovies = filterMovies([...popular, ...latestCompleted]);
  const topAiring = popular.filter((a) => a.status === "RELEASING");

  const rails = [
    {
      key: "finished",
      title: t("home.justFinished"),
      animes: latestCompleted,
      href: ROUTES.SEARCH,
    },
    {
      key: "movies",
      title: t("home.topMovies"),
      animes: topMovies.length ? topMovies : filterMovies(latestCompleted),
      href: `${ROUTES.SEARCH}?type=MOVIE`,
    },
    {
      key: "airing",
      title: t("home.topAiring"),
      animes: topAiring.length ? topAiring : popular,
      href: ROUTES.TRENDING,
    },
    {
      key: "upcoming",
      title: t("home.topUpcoming"),
      animes: upcoming,
      href: `${ROUTES.SEARCH}?status=NOT_YET_RELEASED`,
    },
  ].filter((rail) => rail.animes.length > 0);

  if (!rails.length) return null;

  return (
    <Container id="collections" className="flex flex-col gap-4 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      {rails.map((rail) => (
        <HomeSideListRail
          key={rail.key}
          title={rail.title}
          animes={rail.animes}
          href={rail.href}
        />
      ))}
    </Container>
  );
}
