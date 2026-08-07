"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { RecommendedAnime, RelatedAnime } from "@/types/anime-details";

type Row = {
  id: string;
  name: string;
  poster?: string;
  banner?: string | null;
  meta: string;
  detail?: string;
};

/** Relations we surface as their own labelled block, in display order. */
const PRIMARY_RELATIONS = ["Prequel", "Sequel"] as const;

function normalizeRelation(value?: string | null) {
  return (value ?? "").replace(/[\s_]+/g, "").toLowerCase();
}

function relatedRow(item: RelatedAnime): Row {
  const meta = [item.relationType || item.type, item.seasonYear]
    .filter(Boolean)
    .join(" · ");
  return { id: item.id, name: item.name, poster: item.poster, banner: item.banner, meta };
}

function recommendedRow(item: RecommendedAnime): Row {
  const meta = [item.type, item.episodes?.sub ? `${item.episodes.sub} ep` : null]
    .filter(Boolean)
    .join(" · ");
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
  if (!rows.length) return null;

  return (
    <section className="watch-related-banner-section shrink-0 overflow-hidden rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0a0a0a]/95">
      <h3 className="watch-related-banner-section__title border-b border-border/50 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70 dark:border-white/[0.06] dark:text-white/35">
        {title}
      </h3>
      <div className="space-y-1.5 p-2">
        {rows.map((row) => (
          <Link
            key={`${title}-${row.id}`}
            href={`${ROUTES.ANIME_DETAILS}/${row.id}`}
            className="watch-related-banner-card group"
          >
            {(row.banner || row.poster) ? (
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
              {row.meta && (
                <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground/70 dark:text-white/35">
                  {row.meta}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Prequel / Sequel / other relations / recommendations as compact poster rows
 * for the watch sidebar, sitting under the episode playlist.
 */
export default function WatchRelatedSidebar({
  relatedAnimes,
  recommendedAnimes,
  className,
}: {
  relatedAnimes: RelatedAnime[];
  recommendedAnimes: RecommendedAnime[];
  className?: string;
}) {
  const t = useT();

  const primary = PRIMARY_RELATIONS.map((relation) => ({
    relation,
    rows: relatedAnimes
      .filter((item) => normalizeRelation(item.relationType) === relation.toLowerCase())
      .map(relatedRow),
  })).filter((group) => group.rows.length > 0);

  // The rail scrolls on its own now, so these are generous rather than sized to
  // fit a fixed block — prequels/sequels above are not capped at all.
  const claimed = new Set(PRIMARY_RELATIONS.map((r) => r.toLowerCase()));
  const otherRows = relatedAnimes
    .filter((item) => !claimed.has(normalizeRelation(item.relationType)))
    .slice(0, 12)
    .map(relatedRow);

  const recommendedRows = recommendedAnimes.slice(0, 16).map(recommendedRow);

  if (!primary.length && !otherRows.length && !recommendedRows.length) return null;

  return (
    <div
      // Focusable so the arrow keys drive this rail rather than the page.
      tabIndex={0}
      role="region"
      aria-label={t("watch.relatedAria")}
      className={cn(
        "flex flex-col gap-3",
        // Own scroll area, matching the episode playlist. The rail above is
        // sticky and already spends most of the viewport on episodes, so
        // without a cap these rows sit below the fold and can only be reached
        // by scrolling the whole page to the bottom.
        // Budget: the episode aside takes min(62vh,34rem); this leaves the rest
        // of the viewport clear for the floating nav pill.
        "lg:max-h-[min(30vh,20rem)] lg:overflow-y-auto overscroll-contain scroll-momentum site-thin-scroll",
        className,
      )}
    >
      {primary.map((group) => (
        <SidebarSection
          key={group.relation}
          title={t(`anime.relations.types.${group.relation.toUpperCase()}`)}
          rows={group.rows}
        />
      ))}
      <SidebarSection title={t("common.alsoWatch")} rows={otherRows} />
      <SidebarSection title={t("common.recommended")} rows={recommendedRows} />
    </div>
  );
}
