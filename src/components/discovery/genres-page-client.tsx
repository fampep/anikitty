"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Search, X } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { GENRE_META } from "@/lib/discovery/genres";
import type { GenreOverviewCard } from "@/lib/discovery/genres-overview";

const QUICK_PICK_COUNT = 8;
const ANILIST_TOTAL_CAP = 5000;

const FALLBACK: GenreOverviewCard[] = Object.values(GENRE_META).map((meta) => ({
  ...meta,
  banner: null,
  posters: [],
  total: 0,
}));

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatCount(n: number) {
  if (n <= 0 || n >= ANILIST_TOTAL_CAP) return null;
  return n.toLocaleString("en-US");
}

function PosterStack({ genre }: { genre: GenreOverviewCard }) {
  const posters = genre.posters.slice(0, 3);

  if (!posters.length) {
    return (
      <span className="genre-card__empty-posters" aria-hidden>
        <span />
        <span />
        <span />
      </span>
    );
  }

  return (
    <span className="genre-card__posters" aria-hidden>
      {posters.map((poster, i) => (
        <span key={poster.id} style={{ ["--poster-index" as string]: i }}>
          <Image src={poster.poster} alt="" fill sizes="64px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}

function SpotlightGenre({ genre, index }: { genre: GenreOverviewCard; index: number }) {
  const count = formatCount(genre.total);

  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className={cn(
        "genre-spotlight group relative isolate grid min-h-[16rem] overflow-hidden rounded-2xl border border-border/60 p-5 dark:border-white/[0.08]",
        "sm:min-h-[18rem] sm:p-7 lg:grid-cols-[minmax(0,1fr)_13rem]",
      )}
      style={{ ["--genre-index" as string]: index }}
    >
      {genre.banner ? (
        <Image
          src={genre.banner}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="genre-spotlight__art object-cover"
          priority
        />
      ) : (
        <span className="genre-spotlight__wash" aria-hidden />
      )}

      <span className="genre-spotlight__scrim" aria-hidden />

      {count && (
        <span className="genre-card__count absolute right-4 top-4 z-[2] rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
          {count}
        </span>
      )}

      <span className="relative z-[2] flex h-full flex-col justify-end self-stretch">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
          <Compass className="h-3.5 w-3.5" />
          Start exploring
        </span>
        <span className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          {genre.name}
        </span>
        <span className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/68 sm:text-sm">
          {genre.description}
        </span>
        <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition-transform duration-200 group-hover:translate-x-1">
          Browse this genre
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </span>

      <span className="relative z-[2] mt-6 hidden items-end justify-end lg:flex">
        <PosterStack genre={genre} />
      </span>
    </Link>
  );
}

function QuickGenrePill({ genre, index }: { genre: GenreOverviewCard; index: number }) {
  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className="genre-pill group relative isolate inline-flex min-w-[8rem] items-center justify-between gap-3 overflow-hidden rounded-full border border-border/60 bg-card/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/82 dark:hover:border-white/20"
      style={{ ["--genre-index" as string]: index }}
    >
      <span className="genre-pill__dot" aria-hidden />
      <span className="truncate">{genre.name}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 dark:text-white/35" />
    </Link>
  );
}

function GenreCard({ genre, index }: { genre: GenreOverviewCard; index: number }) {
  const t = useT();
  const count = formatCount(genre.total);

  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className="genre-card group relative isolate flex min-h-[12rem] flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card/70 p-4 dark:border-white/[0.08] dark:bg-[#0b0b0b]"
      style={{ ["--genre-index" as string]: index }}
    >
      {genre.banner ? (
        <Image
          src={genre.banner}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="genre-card__art object-cover"
        />
      ) : (
        <span className="genre-card__wash" aria-hidden />
      )}
      <span className="genre-card__scrim" aria-hidden />

      <div className="relative z-[2] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight text-foreground dark:text-white">
            {genre.name}
          </p>
          <p className="mt-1 line-clamp-2 max-w-[18rem] text-[12px] leading-relaxed text-muted-foreground dark:text-white/48">
            {genre.description}
          </p>
        </div>
        {count && (
          <span className="genre-card__count shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>

      <div className="relative z-[2] mt-6 flex items-end justify-between gap-4">
        <PosterStack genre={genre} />
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground dark:text-white/45 dark:group-hover:text-white/80">
          {t("genres.browse")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function CompactResult({ genre, index }: { genre: GenreOverviewCard; index: number }) {
  const t = useT();

  return (
    <Link
      href={ROUTES.genre(genre.slug)}
      className="genre-result group flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 p-3 transition-colors hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/20"
      style={{ ["--genre-index" as string]: index }}
    >
      <span className="genre-result__mark" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground dark:text-white">
          {genre.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground dark:text-white/40">
          {genre.description}
        </span>
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground dark:text-white/40">
        {t("genres.browse")}
        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
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
        // The static fallback keeps the directory usable if live art is unavailable.
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

  const isFiltering = normalize(query).length > 0;
  const spotlight = filtered[0];
  const quickPicks = isFiltering ? [] : filtered.slice(1, QUICK_PICK_COUNT + 1);
  const directory = isFiltering ? filtered : filtered.slice(1);

  return (
    <Container className="pt-[calc(var(--nav-total-height)+1.5rem)] pb-24">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

      {!isFiltering && spotlight && (
        <div className="mb-5">
          <SpotlightGenre genre={spotlight} index={0} />
        </div>
      )}

      {quickPicks.length > 0 && (
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickPicks.map((genre, i) => (
            <QuickGenrePill key={genre.slug} genre={genre} index={i + 1} />
          ))}
        </div>
      )}

      {directory.length > 0 && (
        <div className={cn(isFiltering ? "grid gap-2.5" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3")}>
          {directory.map((genre, i) =>
            isFiltering ? (
              <CompactResult key={genre.slug} genre={genre} index={i} />
            ) : (
              <GenreCard key={genre.slug} genre={genre} index={i + 1} />
            ),
          )}
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
