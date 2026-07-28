"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import Container from "@/components/layout/container";
import LazyMount from "@/components/shared/lazy-mount";
import { ROUTES } from "@/constants/routes";
import { api } from "@/lib/core/api";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import HomeCompactPoster from "./home-compact-poster";
import {
  HomePosterSkeletonRail,
  HomeRailArrows,
  HomeRailEmpty,
  HomeScrollRail,
  HomeSectionLink,
  useHomeRailScroll,
} from "./home-shared";

type RowDef = {
  id: string;
  titleKey:
    | "trendingNow"
    | "mostPopular"
    | "topRated"
    | "recentlyUpdated"
    | "topMovies"
    | "typeTv"
    | "typeOva"
    | "typeOna"
    | "typeSpecial"
    | "dubbed"
    | "subbed"
    | "hiddenGems"
    | "staffPicks"
    | "genreRow";
  genreLabel?: string;
  href: string;
  query?: string;
  fromPool?: "dub" | "sub" | "staff" | "gems" | "trending" | "popular" | "rated";
};

const STATIC_ROWS: RowDef[] = [
  {
    id: "trending",
    titleKey: "trendingNow",
    href: ROUTES.TRENDING,
    fromPool: "trending",
  },
  {
    id: "popular",
    titleKey: "mostPopular",
    href: `${ROUTES.SEARCH}?sort=most-watched`,
    fromPool: "popular",
  },
  {
    id: "rated",
    titleKey: "topRated",
    href: `${ROUTES.SEARCH}?sort=score`,
    fromPool: "rated",
  },
  {
    id: "updated",
    titleKey: "recentlyUpdated",
    href: `${ROUTES.SEARCH}?sort=recently-updated`,
    query: "sort=recently-updated",
  },
  {
    id: "movies",
    titleKey: "topMovies",
    href: `${ROUTES.SEARCH}?type=movie&sort=most-watched`,
    query: "type=movie&sort=most-watched",
  },
  {
    id: "tv",
    titleKey: "typeTv",
    href: `${ROUTES.SEARCH}?type=tv&sort=most-watched`,
    query: "type=tv&sort=most-watched",
  },
  {
    id: "ova",
    titleKey: "typeOva",
    href: `${ROUTES.SEARCH}?type=ova&sort=score`,
    query: "type=ova&sort=score",
  },
  {
    id: "ona",
    titleKey: "typeOna",
    href: `${ROUTES.SEARCH}?type=ona&sort=most-watched`,
    query: "type=ona&sort=most-watched",
  },
  {
    id: "special",
    titleKey: "typeSpecial",
    href: `${ROUTES.SEARCH}?type=special&sort=score`,
    query: "type=special&sort=score",
  },
  {
    id: "dubbed",
    titleKey: "dubbed",
    href: `${ROUTES.SEARCH}?sort=recently-updated`,
    fromPool: "dub",
  },
  {
    id: "subbed",
    titleKey: "subbed",
    href: `${ROUTES.SEARCH}?sort=recently-updated`,
    fromPool: "sub",
  },
  {
    id: "gems",
    titleKey: "hiddenGems",
    href: `${ROUTES.SEARCH}?sort=score&status=finished-airing`,
    query: "sort=score&status=finished-airing",
    fromPool: "gems",
  },
  {
    id: "staff",
    titleKey: "staffPicks",
    href: ROUTES.SEARCH,
    fromPool: "staff",
  },
];

const GENRE_ROWS: Array<{ slug: string; label: string }> = [
  { slug: "action", label: "Action" },
  { slug: "romance", label: "Romance" },
  { slug: "comedy", label: "Comedy" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "drama", label: "Drama" },
  { slug: "sci-fi", label: "Sci-Fi" },
  { slug: "slice-of-life", label: "Slice of Life" },
  { slug: "horror", label: "Horror" },
];

type Props = {
  pool: IAnime[];
  favorites?: IAnime[];
  rated?: IAnime[];
  trending?: IAnime[];
  popular?: IAnime[];
};

async function fetchRow(query: string, allowAdult: boolean): Promise<IAnime[]> {
  const adult = allowAdult ? "&adult=1" : "";
  const res = await api.get(`/api/search?page=1${adult}&${query}`);
  return (res.data?.data?.animes as IAnime[] | undefined) ?? [];
}

function DiscoveryRow({
  row,
  pool,
  favorites,
  rated,
  trending,
  popular,
}: {
  row: RowDef;
  pool: IAnime[];
  favorites: IAnime[];
  rated: IAnime[];
  trending: IAnime[];
  popular: IAnime[];
}) {
  const t = useT();
  const allowAdult = useSettingsStore((s) => s.showAdultContent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByDir } = useHomeRailScroll(scrollRef);
  const [enabled, setEnabled] = useState(false);

  const pooled = useMemo(() => {
    if (row.fromPool === "trending") return (trending.length ? trending : pool).slice(0, 12);
    if (row.fromPool === "popular") return (popular.length ? popular : pool).slice(0, 12);
    if (row.fromPool === "rated") return (rated.length ? rated : pool).slice(0, 12);
    if (row.fromPool === "dub") return pool.filter((a) => (a.episodes?.dub ?? 0) > 0).slice(0, 12);
    if (row.fromPool === "sub") return pool.filter((a) => (a.episodes?.sub ?? 0) > 0).slice(0, 12);
    if (row.fromPool === "staff") return (favorites.length ? favorites : pool).slice(0, 12);
    if (row.fromPool === "gems") {
      return [...(rated.length ? rated : pool)]
        .filter((a) => (a.score ?? 0) >= 75)
        .slice(0, 12);
    }
    return [];
  }, [row.fromPool, pool, favorites, rated, trending, popular]);

  const needsFetch = Boolean(row.query) && pooled.length < 4;
  const { data, isLoading } = useQuery({
    queryKey: ["home-discovery-row", row.id, row.query, allowAdult],
    queryFn: () => fetchRow(row.query!, allowAdult),
    enabled: enabled && needsFetch,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!needsFetch) setEnabled(true);
  }, [needsFetch]);

  const animes = (pooled.length >= 4 ? pooled : data?.length ? data : pooled).slice(0, 12);
  const title =
    row.titleKey === "genreRow" && row.genreLabel
      ? t("home.genreRow", { genre: row.genreLabel })
      : t(`home.${row.titleKey}`);

  return (
    <LazyMount
      rootMargin="480px 0px"
      minHeight={220}
      keepMounted
      onVisible={() => setEnabled(true)}
    >
      <Container className="flex flex-col gap-3">
        <HomeSectionLink
          href={row.href}
          title={title}
          icon={<Sparkles className="w-4 h-4" />}
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
        {isLoading && !animes.length ? (
          <HomePosterSkeletonRail />
        ) : animes.length ? (
          <HomeScrollRail scrollRef={scrollRef}>
            {animes.map((anime) => (
              <HomeCompactPoster key={`${row.id}-${anime.id}`} anime={anime} />
            ))}
          </HomeScrollRail>
        ) : (
          <HomeRailEmpty message={t("home.sectionEmpty")} />
        )}
      </Container>
    </LazyMount>
  );
}

export default function HomeDiscoveryRows({
  pool,
  favorites = [],
  rated = [],
  trending = [],
  popular = [],
}: Props) {
  const rows = useMemo(() => {
    const genreDefs: RowDef[] = GENRE_ROWS.map((g) => ({
      id: `genre-${g.slug}`,
      titleKey: "genreRow" as const,
      genreLabel: g.label,
      href: `${ROUTES.SEARCH}?genres=${g.slug}&sort=most-watched`,
      query: `genres=${g.slug}&sort=most-watched`,
    }));
    return [...STATIC_ROWS, ...genreDefs];
  }, []);

  return (
    <div id="discovery" className="flex flex-col gap-[var(--home-section-gap)] scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      {rows.map((row) => (
        <DiscoveryRow
          key={row.id}
          row={row}
          pool={pool}
          favorites={favorites}
          rated={rated}
          trending={trending}
          popular={popular}
        />
      ))}
    </div>
  );
}
