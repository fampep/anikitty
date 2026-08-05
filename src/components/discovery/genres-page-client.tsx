"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { GENRE_META } from "@/lib/discovery/genres";
import type { GenreOverviewCard } from "@/lib/discovery/genres-overview";

/** Leading entries fill the bento; the rest become strip rows. */
const FEATURED_COUNT = 6;

/** Placeholder cards so the bento holds its shape before data lands. */
const FALLBACK: GenreOverviewCard[] = Object.values(GENRE_META).map((meta) => ({
  ...meta,
  banner: null,
  posters: [],
  total: 0,
}));

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/** AniList stops counting past this and returns the cap verbatim. */
const ANILIST_TOTAL_CAP = 5000;

/**
 * Fixed en-US grouping rather than the visitor's locale: under a comma-decimal
 * locale `5000` renders as "5.000", which reads as five-point-zero on a badge.
 *
 * Nothing is shown at or above the cap. Every broad genre pins to exactly 5000,
 * so a badge there is the same non-number on every card — worse than no badge.
 */
function formatCount(n: number) {
  if (n <= 0 || n >= ANILIST_TOTAL_CAP) return null;
  return n.toLocaleString("en-US");
}

/**
 * Bento tile. `index` drives the fallback tint so a genre with no banner still
 * reads as part of the set rather than an empty box.
 */
function FeaturedTile({
  genre,
  index,
  size,
}: {
  genre: GenreOverviewCard;
  index: number;
  size: "lg" | "md" | "sm";
}) {
  const count = formatCount(genre.total);

  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className={cn(
        "genre-tile group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-border/60 dark:border-white/[0.08]",
        size === "lg" && "min-h-[15rem] p-6 sm:min-h-[19rem]",
        size === "md" && "min-h-[8.5rem] p-5",
        size === "sm" && "min-h-[8.5rem] p-4",
      )}
      style={{ ["--genre-index" as string]: index }}
    >
      {genre.banner ? (
        <Image
          src={genre.banner}
          alt=""
          fill
          sizes={size === "lg" ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 1024px) 100vw, 30vw"}
          className="genre-tile__art object-cover"
          priority={size === "lg"}
        />
      ) : (
        <span className="genre-tile__wash" aria-hidden />
      )}

      {/* Keeps the name legible over arbitrary artwork. */}
      <span className="genre-tile__scrim" aria-hidden />

      {count && (
        <span className="genre-tile__count absolute right-3 top-3 z-[2] rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {count}
        </span>
      )}

      <span
        className={cn(
          "relative z-[2] font-semibold tracking-tight text-white",
          size === "lg" ? "text-3xl sm:text-4xl" : "text-xl",
        )}
      >
        {genre.name}
      </span>
      <span
        className={cn(
          "relative z-[2] mt-1 text-white/65",
          size === "lg" ? "max-w-sm text-[13px] leading-snug" : "line-clamp-1 text-[12px]",
        )}
      >
        {genre.description}
      </span>
    </Link>
  );
}

/** Strip row — label block on the left, poster run on the right. */
function GenreRow({ genre, index }: { genre: GenreOverviewCard; index: number }) {
  const t = useT();
  const count = formatCount(genre.total);

  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className="genre-row group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border/60 p-3 dark:border-white/[0.08]"
      style={{ ["--genre-index" as string]: index }}
    >
      {genre.banner && (
        <Image
          src={genre.banner}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="genre-row__art object-cover"
        />
      )}
      <span className="genre-row__scrim" aria-hidden />

      <div className="relative z-[2] w-32 shrink-0 sm:w-40">
        <p className="truncate text-[14px] font-semibold tracking-tight text-foreground dark:text-white">
          {genre.name}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/80 dark:text-white/45">
          {t("genres.browse")}
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          {count && <span className="ml-1 tabular-nums">· {count}</span>}
        </span>
      </div>

      <div className="relative z-[2] flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        {genre.posters.map((p) => (
          <span
            key={p.id}
            className="relative h-[3.4rem] w-10 shrink-0 overflow-hidden rounded ring-1 ring-white/10"
          >
            <Image src={p.poster} alt="" fill sizes="40px" className="object-cover" />
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function GenresPageClient() {
  const t = useT();
  const adult = useSettingsStore((s) => s.showAdultContent);
  const [genres, setGenres] = useState<GenreOverviewCard[]>(FALLBACK);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/genres${adult ? "?adult=1" : ""}`);
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data) && json.data.length) {
          setGenres(json.data);
        }
      } catch {
        // Keep the static fallback — the page is still fully navigable without art.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adult]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return genres;
    return genres.filter(
      (g) => normalize(g.name).includes(q) || normalize(g.slug).includes(q),
    );
  }, [genres, query]);

  // A narrowed list reads better as one even set than "featured plus leftovers".
  const isFiltering = normalize(query).length > 0;
  const featured = isFiltering ? [] : filtered.slice(0, FEATURED_COUNT);
  const rest = isFiltering ? filtered : filtered.slice(FEATURED_COUNT);

  return (
    <Container className="pt-[calc(var(--nav-total-height)+1.5rem)] pb-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground dark:text-white sm:text-3xl">
            {t("nav.short.genre")}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground dark:text-white/45">
            {t("genres.subtitle")}
          </p>
        </div>

        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-white/35"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("genres.filterPlaceholder")}
            aria-label={t("genres.filterPlaceholder")}
            className="site-input h-9 w-full pl-9 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("search.clear")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground dark:text-white/35 dark:hover:text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bento: one hero tile, two stacked beside it, three across the bottom. */}
      {featured.length > 0 && (
        <div className="mb-4 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {featured[0] && <FeaturedTile genre={featured[0]} index={0} size="lg" />}
          </div>
          <div className="grid gap-3 lg:col-span-5">
            {featured.slice(1, 3).map((genre, i) => (
              <FeaturedTile key={genre.slug} genre={genre} index={i + 1} size="md" />
            ))}
          </div>
          {featured.slice(3, 6).map((genre, i) => (
            <div key={genre.slug} className="lg:col-span-4">
              <FeaturedTile genre={genre} index={i + 3} size="sm" />
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {rest.map((genre, i) => (
            <GenreRow key={genre.slug} genre={genre} index={featured.length + i} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-14 text-center text-sm text-muted-foreground dark:text-white/40">
          {t("genres.noMatches", { query: query.trim() })}
        </p>
      )}
    </Container>
  );
}
