"use client";

import { useMemo } from "react";
import { Film } from "lucide-react";
import Container from "@/components/layout/container";
import HomeCompactPoster from "@/components/home/home-compact-poster";
import { SectionHeading } from "@/components/home/section-heading";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import type { IAnime } from "@/types/anime";

type Props = {
  /** Mixed pools to sift movies out of — no dedicated movies endpoint exists. */
  pools: (IAnime[] | undefined)[];
  loading?: boolean;
  limit?: number;
  bare?: boolean;
};

function isMovie(anime: IAnime): boolean {
  return (anime.type ?? "").toLowerCase() === "movie";
}

export default function HomePopularMovies({ pools, loading, limit = 12, bare }: Props) {
  const t = useT();

  const movies = useMemo(() => {
    const seen = new Set<string>();
    const out: IAnime[] = [];
    for (const pool of pools) {
      for (const anime of pool ?? []) {
        if (!isMovie(anime) || seen.has(anime.id)) continue;
        seen.add(anime.id);
        out.push(anime);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }, [pools, limit]);

  // The pools are general-purpose, so a given load may contain no films at
  // all. An empty shelf is worse than no shelf.
  if (!loading && movies.length === 0) return null;

  const body = (
    <>
      <SectionHeading
        icon={<Film className="h-4 w-4" />}
        title={t("home.popularMovies")}
        subtitle={t("home.popularMoviesDesc")}
        href={`${ROUTES.SEARCH}?type=movie&sort=most-watched`}
      />
      {loading && movies.length === 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {movies.map((anime) => (
            <HomeCompactPoster key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </>
  );

  if (bare) return <div className="flex flex-col gap-3">{body}</div>;

  return <Container className="flex flex-col gap-3">{body}</Container>;
}
