"use client";

import Link from "next/link";
import { Flame, Star } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import type { IAnime } from "@/types/anime";
import { formatAnimeType, scoreLabel } from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
  limit?: number;
  className?: string;
};

/**
 * Compact ranked list that sits beside Continue Watching on desktop.
 *
 * Deliberately shows no rank-movement arrows or period switcher: nothing
 * records daily rank snapshots, so both would be fabricated. See the note in
 * home-rankings.tsx for the same reasoning.
 */
export default function HomeTrendingSidebar({ animes, loading, limit = 8, className }: Props) {
  const t = useT();
  const items = animes.slice(0, limit);

  return (
    <aside
      className={cn(
        "site-panel flex flex-col gap-3 rounded-2xl p-4",
        className,
      )}
      aria-label={t("home.trendingNow")}
    >
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-foreground/70 dark:text-white/70" />
        <h2 className="text-sm font-bold tracking-tight text-foreground dark:text-white/90">
          {t("home.trendingNow")}
        </h2>
        <Link
          href={ROUTES.TRENDING}
          className="ml-auto text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:text-white/35 dark:hover:text-white/70"
        >
          {t("home.seeAll")}
        </Link>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((anime, i) => {
            const rating = scoreLabel(anime.score);
            return (
              <li key={anime.id}>
                <Link
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  className="group flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-accent/60 dark:hover:bg-white/[0.05]"
                >
                  <span
                    className={cn(
                      "w-5 shrink-0 text-center font-mono text-sm font-bold tabular-nums",
                      i < 3
                        ? "text-foreground dark:text-white/85"
                        : "text-muted-foreground dark:text-white/25",
                    )}
                  >
                    {i + 1}
                  </span>

                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                    <LazyPosterImage
                      src={anime.poster}
                      alt={anime.name}
                      imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="40px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground dark:text-white/80">
                      {anime.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground dark:text-white/30">
                      <span>{formatAnimeType(anime.type)}</span>
                      {rating && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" />
                          {rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
