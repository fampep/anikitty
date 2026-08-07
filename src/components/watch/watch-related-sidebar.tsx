"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { RecommendedAnime, RelatedAnime, Season } from "@/types/anime-details";

type Row = {
  id: string;
  name: string;
  poster?: string;
  banner?: string | null;
  meta: string;
  detail?: string;
};

const COLLAPSED_ROWS = 5;

function relatedRow(item: RelatedAnime): Row {
  const meta = [item.relationType || item.type, item.seasonYear].filter(Boolean).join(" / ");
  return { id: item.id, name: item.name, poster: item.poster, banner: item.banner, meta };
}

function recommendedRow(item: RecommendedAnime): Row {
  const meta = [item.type, item.episodes?.sub ? `${item.episodes.sub} ep` : null]
    .filter(Boolean)
    .join(" / ");
  return {
    id: item.id,
    name: item.name,
    poster: item.poster,
    banner: item.banner,
    meta,
    detail: item.genres?.slice(0, 2).join(" / "),
  };
}

function SidebarSection({ title, rows }: { title: string; rows: Row[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return null;

  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const canExpand = rows.length > COLLAPSED_ROWS;

  return (
    <section className="watch-related-banner-section shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0a0a0a]/95">
      <h3 className="watch-related-banner-section__title border-b border-border/50 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 dark:border-white/[0.06] dark:text-white/35">
        <ChevronRight className="mr-1.5 inline h-3.5 w-3.5" />
        {title}
      </h3>
      <div className="space-y-1.5 p-2">
        {visibleRows.map((row) => (
          <Link
            key={`${title}-${row.id}`}
            href={`${ROUTES.ANIME_DETAILS}/${row.id}`}
            className="watch-related-banner-card group"
          >
            {row.banner || row.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.banner || row.poster}
                alt=""
                loading="lazy"
                aria-hidden
                className="watch-related-banner-card__backdrop"
              />
            ) : null}
            <span className="watch-related-banner-card__shade" aria-hidden />
            <div className="watch-related-banner-card__poster">
              {row.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.poster}
                  alt={row.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground/95 dark:text-white/90">
                {row.name}
              </p>
              {row.detail ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80 dark:text-white/45">
                  {row.detail}
                </p>
              ) : null}
              {row.meta ? (
                <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground/70 dark:text-white/35">
                  {row.meta}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="watch-related-show-more site-focus"
            aria-expanded={expanded}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SeasonsSection({ seasons }: { seasons: Season[] }) {
  const visible = seasons.filter((season) => season.id && season.name).slice(0, 8);
  if (visible.length <= 1) return null;

  return (
    <section className="watch-related-banner-section shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0a0a0a]/95">
      <h3 className="watch-related-banner-section__title border-b border-border/50 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 dark:border-white/[0.06] dark:text-white/35">
        <ChevronRight className="mr-1.5 inline h-3.5 w-3.5" />
        Seasons
      </h3>
      <div className="grid grid-cols-2 gap-2 p-2">
        {visible.map((season) => (
          <Link
            key={season.id}
            href={`${ROUTES.ANIME_DETAILS}/${season.id}`}
            className="watch-season-banner-card group"
          >
            {season.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={season.poster}
                alt=""
                loading="lazy"
                aria-hidden
                className="watch-season-banner-card__image"
              />
            ) : null}
            <span className="watch-season-banner-card__shade" aria-hidden />
            <span className="relative line-clamp-2 px-2 text-center text-sm font-black leading-tight text-white drop-shadow">
              {season.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function WatchRelatedSidebar({
  relatedAnimes,
  recommendedAnimes,
  seasons = [],
  className,
}: {
  relatedAnimes: RelatedAnime[];
  recommendedAnimes: RecommendedAnime[];
  seasons?: Season[];
  className?: string;
}) {
  const t = useT();
  const relatedRows = relatedAnimes.map(relatedRow);
  const recommendedRows = recommendedAnimes.slice(0, 16).map(recommendedRow);

  if (seasons.length <= 1 && !relatedRows.length && !recommendedRows.length) return null;

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={t("watch.relatedAria")}
      className={cn("flex flex-col gap-3", className)}
    >
      <SeasonsSection seasons={seasons} />
      <SidebarSection title={t("watch.tabs.related")} rows={relatedRows} />
      <SidebarSection title={t("common.recommended")} rows={recommendedRows} />
    </div>
  );
}
