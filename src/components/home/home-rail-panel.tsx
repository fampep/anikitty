"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import type { IAnime } from "@/types/anime";
import { formatAnimeType, scoreLabel } from "./home-shared";

type Props = {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  animes: IAnime[];
  loading?: boolean;
  limit?: number;
  /** Show 1..n position numbers (ranked lists only). */
  showRank?: boolean;
  className?: string;
};

/**
 * Compact vertical list for the home right rail — poster thumb, title, and a
 * metadata line. Several of these stack to form the rail.
 *
 * Ranked variants deliberately carry no movement arrows or period switcher:
 * nothing records daily rank snapshots, so both would be fabricated. Same
 * reasoning as the note in home-rankings.tsx.
 */
export default function HomeRailPanel({
  title,
  icon,
  href,
  animes,
  loading,
  limit = 8,
  showRank = false,
  className,
}: Props) {
  const t = useT();
  const items = animes.slice(0, limit);

  if (!loading && items.length === 0) return null;

  return (
    <section className={cn("site-panel flex flex-col gap-3 rounded-2xl p-4", className)} aria-label={title}>
      <div className="flex items-center gap-2">
        {icon ? <span className="text-foreground/70 dark:text-white/70">{icon}</span> : null}
        <h2 className="text-sm font-bold tracking-tight text-foreground dark:text-white/90">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:text-white/35 dark:hover:text-white/70"
          >
            {t("home.seeAll")}
            <ChevronRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((anime, i) => {
            const rating = scoreLabel(anime.score);
            const sub = anime.episodes?.sub ?? 0;
            const dub = anime.episodes?.dub ?? 0;
            return (
              <li key={anime.id}>
                <Link
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-accent/60 dark:hover:bg-white/[0.05]"
                >
                  {showRank ? (
                    <span
                      className={cn(
                        "w-4 shrink-0 text-center font-mono text-sm font-bold tabular-nums",
                        i < 3
                          ? "text-foreground dark:text-white/85"
                          : "text-muted-foreground dark:text-white/25",
                      )}
                    >
                      {i + 1}
                    </span>
                  ) : null}

                  {/* `relative` is required: LazyPosterImage renders an
                      absolutely-positioned fill image, so without it the
                      poster escapes to the nearest positioned ancestor and
                      stretches its 40px source across it. */}
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                    <LazyPosterImage
                      src={anime.poster}
                      alt={anime.name}
                      imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="80px"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground dark:text-white/80">
                      {anime.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground dark:text-white/30">
                      <span>{formatAnimeType(anime.type)}</span>
                      {anime.year ? <span>{anime.year}</span> : null}
                      {sub > 0 ? <span className="tabular-nums">{dub > 0 ? `${sub}/${dub}` : sub}</span> : null}
                      {rating ? (
                        <span className="inline-flex items-center gap-0.5 tabular-nums">
                          <Star className="h-2.5 w-2.5" />
                          {rating}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
