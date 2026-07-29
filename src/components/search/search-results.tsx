"use client";

import React from "react";
import { ROUTES } from "@/constants/routes";
import AnimeCard from "@/components/anime/anime-card";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetSearchAnimeResults } from "@/query/search/get-search-results";
import { useSearchVoiceActors } from "@/query/search/search-anime";
import Pagination from "@/components/common/pagination";
import { useAnimeSearchParams } from "@/hooks/use-anime-search-params";
import { useFilterLabels } from "@/hooks/use-filter-labels";
import { useT } from "@/providers/i18n-provider";
import Select from "@/components/common/select";
import { SearchAnimeParams } from "@/types/anime";
import { cn } from "@/lib/core/utils";
import SearchBar from "@/components/layout/search-bar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Mic,
  SlidersHorizontal,
  RotateCcw,
  Search,
  RefreshCw,
  Minus,
  Plus,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import {
  cycleGenreFilterMode,
  parseGenreFilterModes,
  serializeGenreFilterModes,
  type GenreFilterMode,
} from "@/lib/search/genre-filters";

function normalizeFilterParam(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "all") return undefined;
  return trimmed;
}

function filtersMatchParams(filters: SearchAnimeParams, params: SearchAnimeParams) {
  const keys: (keyof SearchAnimeParams)[] = [
    "type",
    "status",
    "season",
    "sort",
    "genres",
    "excludeGenres",
    "year",
    "decade",
    "source",
    "country",
    "demographic",
    "tags",
    "episodes",
    "runtime",
    "scoreMin",
    "language",
    "rated",
    "studio",
  ];
  return keys.every(
    (key) => normalizeFilterParam(filters[key] as string | undefined) === normalizeFilterParam(params[key] as string | undefined),
  );
}

const EMPTY_FILTERS: SearchAnimeParams = {
  q: "",
  page: 1,
  type: "",
  status: "",
  rated: "",
  season: "",
  language: "",
  sort: "",
  genres: "",
  excludeGenres: "",
  year: "",
  decade: "",
  studio: "",
  source: "",
  tags: "",
  demographic: "",
  country: "",
  episodeMin: "",
  episodeMax: "",
  durationMin: "",
  durationMax: "",
  scoreMin: "",
  episodes: "",
  runtime: "",
};

const SearchResults = () => {
  const t = useT();
  const filterLabels = useFilterLabels();
  const params = useAnimeSearchParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { recent, addRecent, removeRecent, clearRecent } = useRecentSearches();
  const displayPhrase = params.q.replace(/^"+|"+$/g, "").trim();

  const { data: searchResults, isLoading, isError, refetch, isFetching } = useGetSearchAnimeResults(params);
  const showVaSearch = displayPhrase.trim().length >= 2;
  const {
    data: vaSearch,
    isLoading: vaLoading,
    isFetching: vaFetching,
  } = useSearchVoiceActors(displayPhrase, 1, showVaSearch);

  const [filters, setFilters] = React.useState<SearchAnimeParams>({
    ...EMPTY_FILTERS,
    ...params,
  });

  React.useEffect(() => {
    setFilters({
      ...EMPTY_FILTERS,
      ...params,
    });
  }, [params]);

  React.useEffect(() => {
    if (displayPhrase) addRecent(displayPhrase);
  }, [displayPhrase, addRecent]);

  const genreModes = React.useMemo(
    () => parseGenreFilterModes(filters.genres, filters.excludeGenres),
    [filters.genres, filters.excludeGenres],
  );

  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const handleNextPage = () => {
    if (searchResults?.hasNextPage) handlePageChange((params.page || 1) + 1);
  };
  const handlePreviousPage = () => {
    if ((params.page || 1) > 1) handlePageChange((params.page || 1) - 1);
  };
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1) return;
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", pageNumber.toString());
    router.push(`/search?${p.toString()}`);
  };

  const onChange = (key: keyof SearchAnimeParams, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = React.useCallback(
    (nextFilters: SearchAnimeParams, query = params.q) => {
      const p = new URLSearchParams();
      if (query) p.set("q", query);
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (key === "q") return;
        if (typeof value === "string" && value.trim() && value !== "all") {
          p.set(key, value);
        } else if (typeof value === "number" && !isNaN(value) && key !== "page") {
          p.set(key, value.toString());
        }
      });
      router.push(`/search?${p.toString()}`);
    },
    [params.q, router],
  );

  const cycleGenre = (slug: string) => {
    const nextModes = { ...genreModes };
    const nextMode = cycleGenreFilterMode(nextModes[slug]);
    if (nextMode) nextModes[slug] = nextMode;
    else delete nextModes[slug];
    const serialized = serializeGenreFilterModes(nextModes);
    setFilters((prev) => ({ ...prev, ...serialized, page: 1 }));
  };

  const [debouncedFilters, setDebouncedFilters] = React.useState(filters);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedFilters(filters), 400);
    return () => window.clearTimeout(id);
  }, [filters]);

  React.useEffect(() => {
    if (isMobile) return;
    if (filtersMatchParams(debouncedFilters, params)) return;
    applyFilters({ ...debouncedFilters, page: 1 });
  }, [debouncedFilters, params, applyFilters, isMobile]);

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    router.push("/search");
  };

  const activeFilterCount = [
    filters.type && filters.type !== "all",
    filters.status,
    filters.season,
    filters.year,
    filters.decade,
    filters.sort && filters.sort !== "default",
    filters.genres,
    filters.excludeGenres,
    filters.source,
    filters.country,
    filters.demographic,
    filters.tags,
    filters.episodes,
    filters.runtime,
    filters.scoreMin,
    filters.language,
    filters.rated,
    filters.studio,
  ].filter(Boolean).length;

  const genreModeLabel = (mode: GenreFilterMode | undefined, label: string) => {
    if (mode === "include") return t("search.genreIncludeLabel", { genre: label });
    if (mode === "exclude") return t("search.genreExcludeLabel", { genre: label });
    return t("search.genreNeutralLabel", { genre: label });
  };

  const labelFor = (list: { value: string; label: string }[], value: string) =>
    list.find((o) => o.value === value)?.label ?? value;

  // Removing a single filter applies immediately on both desktop and mobile so
  // the chip disappears and results refresh without needing "Apply".
  const clearFilterKey = (key: keyof SearchAnimeParams) => {
    const next = { ...filters, [key]: "", page: 1 };
    setFilters(next);
    applyFilters(next);
  };

  const removeGenre = (slug: string) => {
    const nextModes = { ...genreModes };
    delete nextModes[slug];
    const next = { ...filters, ...serializeGenreFilterModes(nextModes), page: 1 };
    setFilters(next);
    applyFilters(next);
  };

  type ActiveChip = {
    id: string;
    label: string;
    tone: "neutral" | "include" | "exclude";
    onRemove: () => void;
  };

  const activeChips: ActiveChip[] = [];
  if (filters.type && filters.type !== "all")
    activeChips.push({ id: "type", label: labelFor(filterLabels.types, filters.type), tone: "neutral", onRemove: () => clearFilterKey("type") });
  if (filters.status)
    activeChips.push({ id: "status", label: labelFor(filterLabels.statuses, filters.status), tone: "neutral", onRemove: () => clearFilterKey("status") });
  if (filters.season)
    activeChips.push({ id: "season", label: labelFor(filterLabels.seasons, filters.season), tone: "neutral", onRemove: () => clearFilterKey("season") });
  if (filters.year)
    activeChips.push({ id: "year", label: labelFor(filterLabels.years, filters.year), tone: "neutral", onRemove: () => clearFilterKey("year") });
  if (filters.decade)
    activeChips.push({ id: "decade", label: labelFor(filterLabels.decades, filters.decade), tone: "neutral", onRemove: () => clearFilterKey("decade") });
  if (filters.sort && filters.sort !== "default")
    activeChips.push({ id: "sort", label: labelFor(filterLabels.sort, filters.sort), tone: "neutral", onRemove: () => clearFilterKey("sort") });
  if (filters.source)
    activeChips.push({ id: "source", label: labelFor(filterLabels.sources, filters.source), tone: "neutral", onRemove: () => clearFilterKey("source") });
  if (filters.country)
    activeChips.push({ id: "country", label: labelFor(filterLabels.countries, filters.country), tone: "neutral", onRemove: () => clearFilterKey("country") });
  if (filters.demographic)
    activeChips.push({ id: "demographic", label: labelFor(filterLabels.demographics, filters.demographic), tone: "neutral", onRemove: () => clearFilterKey("demographic") });
  if (filters.episodes)
    activeChips.push({ id: "episodes", label: labelFor(filterLabels.episodeRanges, filters.episodes), tone: "neutral", onRemove: () => clearFilterKey("episodes") });
  if (filters.runtime)
    activeChips.push({ id: "runtime", label: labelFor(filterLabels.runtimeRanges, filters.runtime), tone: "neutral", onRemove: () => clearFilterKey("runtime") });
  if (filters.scoreMin)
    activeChips.push({ id: "scoreMin", label: `${filters.scoreMin}+`, tone: "neutral", onRemove: () => clearFilterKey("scoreMin") });
  if (filters.language)
    activeChips.push({ id: "language", label: labelFor(filterLabels.languages, filters.language), tone: "neutral", onRemove: () => clearFilterKey("language") });
  if (filters.rated)
    activeChips.push({ id: "rated", label: labelFor(filterLabels.ratings, filters.rated), tone: "neutral", onRemove: () => clearFilterKey("rated") });
  if (filters.studio)
    activeChips.push({ id: "studio", label: `Studio #${filters.studio}`, tone: "neutral", onRemove: () => clearFilterKey("studio") });
  if (filters.tags) {
    filters.tags.split(",").filter(Boolean).forEach((tag) => {
      activeChips.push({
        id: `tag-${tag}`,
        label: tag,
        tone: "include",
        onRemove: () => {
          const next = filters.tags!.split(",").filter((t) => t !== tag).join(",");
          const updated = { ...filters, tags: next, page: 1 };
          setFilters(updated);
          applyFilters(updated);
        },
      });
    });
  }
  Object.entries(genreModes).forEach(([slug, mode]) => {
    activeChips.push({
      id: `genre-${slug}`,
      label: labelFor(filterLabels.genres, slug),
      tone: mode === "exclude" ? "exclude" : "include",
      onRemove: () => removeGenre(slug),
    });
  });

  return (
    <div className="flex flex-col gap-8 mt-28 lg:mt-36 pb-20 min-h-[75vh]">
      <div className="max-w-2xl flex flex-col gap-3">
        <SearchBar
          key={displayPhrase}
          defaultValue={displayPhrase}
          onSubmitQuery={(q) => applyFilters(filters, q)}
        />

        {displayPhrase === "" && recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35 mr-0.5">
              <Clock className="h-3 w-3" />
              {t("search.recentSearches")}
            </span>
            {recent.map((query) => (
              <span
                key={query}
                className="group inline-flex items-center rounded-full border border-border dark:border-white/15 bg-muted/60 dark:bg-white/[0.06] text-xs text-foreground/80 dark:text-white/70 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => applyFilters(filters, query)}
                  className="h-7 pl-2.5 pr-1.5 hover:bg-muted dark:hover:bg-white/10 transition-colors max-w-[12rem] truncate"
                >
                  {query}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecent(query)}
                  aria-label={t("search.removeRecent", { query })}
                  className="h-7 pr-2 pl-0.5 text-muted-foreground/60 dark:text-white/40 hover:text-foreground dark:hover:text-white/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearRecent}
              className="ml-1 text-[11px] text-muted-foreground dark:text-white/35 hover:text-foreground dark:hover:text-white/60 transition-colors"
            >
              {t("search.clearRecent")}
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-muted/40 dark:bg-white/4 border border-border dark:border-white/10 backdrop-blur-sm site-panel rounded-xl p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground dark:text-white/50" />
            <span className="text-sm font-semibold text-foreground/90 dark:text-white/80">{t("search.filters")}</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-foreground dark:text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground dark:text-white/35 hover:text-foreground dark:hover:text-white/60 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t("search.reset")}
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80 transition-colors"
            >
              {filtersOpen ? t("search.hideFilters") : t("search.showFilters")}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t("search.activeFilters")}>
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onRemove}
                aria-label={t("search.removeFilter", { filter: chip.label })}
                className={cn(
                  "group inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full border text-xs font-medium transition-colors",
                  chip.tone === "neutral" &&
                    "border-border dark:border-white/15 bg-muted/60 dark:bg-white/[0.06] text-foreground/80 dark:text-white/70 hover:bg-muted dark:hover:bg-white/10",
                  chip.tone === "include" &&
                    "border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
                  chip.tone === "exclude" &&
                    "border-rose-500/50 bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20",
                )}
              >
                {chip.tone === "exclude" && <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />}
                {chip.tone === "include" && <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />}
                <span className="max-w-[10rem] truncate">{chip.label}</span>
                <X className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-90 transition-opacity" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className={cn("flex-col gap-5", filtersOpen ? "flex" : "hidden lg:flex")}>

        <div className="flex flex-wrap gap-2">
          <Select options={filterLabels.types} placeholder={t("search.placeholders.type")} value={filters.type || ""} onChange={(val) => onChange("type", val)} />
          <Select options={filterLabels.statuses} placeholder={t("search.placeholders.status")} value={filters.status || ""} onChange={(val) => onChange("status", val)} />
          <Select options={filterLabels.seasons} placeholder={t("search.placeholders.season")} value={filters.season || ""} onChange={(val) => onChange("season", val)} />
          <Select options={filterLabels.years} placeholder={t("search.placeholders.year")} value={filters.year || ""} onChange={(val) => onChange("year", val)} />
          <Select options={filterLabels.decades} placeholder={t("search.placeholders.decade")} value={filters.decade || ""} onChange={(val) => onChange("decade", val)} />
          <Select options={filterLabels.sort} placeholder={t("search.placeholders.sort")} value={filters.sort || ""} onChange={(val) => onChange("sort", val)} />
          <Select options={filterLabels.sources} placeholder={t("search.placeholders.source")} value={filters.source || ""} onChange={(val) => onChange("source", val)} />
          <Select options={filterLabels.countries} placeholder={t("search.placeholders.country")} value={filters.country || ""} onChange={(val) => onChange("country", val)} />
          <Select options={filterLabels.demographics} placeholder={t("search.placeholders.demographic")} value={filters.demographic || ""} onChange={(val) => onChange("demographic", val)} />
          <Select options={filterLabels.episodeRanges} placeholder={t("search.placeholders.episodes")} value={filters.episodes || ""} onChange={(val) => onChange("episodes", val)} />
          <Select options={filterLabels.runtimeRanges} placeholder={t("search.placeholders.runtime")} value={filters.runtime || ""} onChange={(val) => onChange("runtime", val)} />
          <Select
            options={filterLabels.scoreRanges.map((o) => ({ value: o.value, label: o.label }))}
            placeholder={t("search.placeholders.rating")}
            value={filters.scoreMin || ""}
            onChange={(val) => onChange("scoreMin", val)}
          />
          <Select options={filterLabels.languages} placeholder={t("search.placeholders.language")} value={filters.language || ""} onChange={(val) => onChange("language", val)} />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground dark:text-white/40 uppercase tracking-widest">{t("search.themes")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterLabels.themes.map((theme) => {
              const active = (filters.tags || "")
                .split(",")
                .map((x) => x.trim())
                .includes(theme.value);
              return (
                <button
                  key={theme.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const current = (filters.tags || "").split(",").map((x) => x.trim()).filter(Boolean);
                    const next = active
                      ? current.filter((x) => x !== theme.value)
                      : [...current, theme.value];
                    onChange("tags", next.join(","));
                  }}
                  className={cn(
                    "inline-flex items-center border text-xs h-7 px-2.5 rounded-full transition-colors",
                    !active &&
                      "border-border dark:border-white/15 text-muted-foreground dark:text-white/35 hover:border-border dark:hover:border-white/30 hover:text-muted-foreground dark:hover:text-white/60",
                    active &&
                      "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15",
                  )}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs font-semibold text-muted-foreground dark:text-white/40 uppercase tracking-widest">{t("search.genres")}</p>
            <p className="text-[11px] text-muted-foreground/80 dark:text-white/30">{t("search.genreCycleHint")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterLabels.genres.map((genre) => {
              const mode = genreModes[genre.value];
              return (
                <button
                  key={genre.value}
                  type="button"
                  aria-pressed={mode === "include" ? true : mode === "exclude" ? "mixed" : false}
                  aria-label={genreModeLabel(mode, genre.label)}
                  title={genreModeLabel(mode, genre.label)}
                  onClick={() => cycleGenre(genre.value)}
                  className={cn(
                    "inline-flex items-center gap-1 border text-xs h-7 px-2.5 rounded-full transition-colors",
                    !mode &&
                      "border-border dark:border-white/15 text-muted-foreground dark:text-white/35 hover:border-border dark:hover:border-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:bg-muted/60 dark:hover:bg-white/6",
                    mode === "include" &&
                      "border-emerald-500/50 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15",
                    mode === "exclude" &&
                      "border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-rose-500/15 line-through decoration-rose-500/70",
                  )}
                >
                  {mode === "include" && <Plus className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  {mode === "exclude" && <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  {genre.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => applyFilters(filters)}
          className="self-start flex items-center gap-2 bg-accent dark:bg-white/10 text-foreground dark:text-white hover:bg-muted dark:bg-white/15 border border-border dark:border-white/10 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors lg:hidden"
        >
          <Search className="h-3.5 w-3.5" />
          {t("search.apply")}
        </button>
        <p className="hidden lg:block text-[11px] text-muted-foreground/80 dark:text-white/25 font-mono">
          {t("search.filtersAutoApply")}
        </p>
        </div>
      </div>

      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 bg-muted/50 dark:bg-white/50 rounded-full" />
        <h1 className="text-xl font-bold text-foreground dark:text-white/90">
          {displayPhrase === "" ? (
            t("search.browseAnime")
          ) : (
            t("search.resultsFor", { query: displayPhrase })
          )}
        </h1>
        {(isFetching || vaFetching) && !isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/35 font-mono">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("search.updating")}
          </span>
        )}
      </div>

      {/* Anime section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35">
            {t("search.sectionAnime")}
          </h2>
          {searchResults && !isLoading && (
            <span className="text-xs text-muted-foreground dark:text-white/35 font-mono">
              {searchResults.totalResults
                ? `${t("search.resultsCount", { count: searchResults.totalResults.toLocaleString() })} · ${t("search.pageOf", { current: searchResults.currentPage, total: searchResults.totalPages })}`
                : t("search.pageOf", { current: searchResults.currentPage, total: searchResults.totalPages })}
            </span>
          )}
        </div>

        {isError && !searchResults ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">{t("search.loadError")}</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              {t("common.tryAgain")}
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {Array.from({ length: 14 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-2 w-full">
                <div className="rounded-xl aspect-[2/3] w-full animate-pulse bg-muted/60 dark:bg-white/[0.06]" />
                <div className="h-3 w-[80%] rounded animate-pulse bg-muted/50 dark:bg-white/[0.05]" />
                <div className="h-2.5 w-1/2 rounded animate-pulse bg-muted/40 dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {searchResults?.animes.map((anime) => (
              <AnimeCard
                key={anime.id}
                title={anime.name}
                subTitle={anime.type}
                poster={anime.poster}
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="self-center justify-self-center w-full"
                showGenre={false}
                episodeCard
                deferImage
                sub={anime.episodes?.sub}
                dub={anime.episodes?.dub}
                score={anime.score}
                year={anime.year}
                status={anime.status}
              />
            ))}
            {searchResults?.animes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <span className="text-5xl mb-4">🐱</span>
                <p className="text-muted-foreground dark:text-white/50 font-medium">{t("search.noResults")}</p>
                <p className="text-muted-foreground dark:text-white/35 text-sm mt-1">{t("search.noResultsHint")}</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/70 text-sm font-semibold transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("search.clearFilters")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {searchResults && searchResults.totalPages > 1 && (
          <Pagination
            totalPages={searchResults.totalPages}
            currentPage={params.page}
            handleNextPage={handleNextPage}
            handlePageChange={handlePageChange}
            handlePreviousPage={handlePreviousPage}
          />
        )}
      </section>

      {/* Voice actors section — only when searching by name */}
      {showVaSearch && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35">
              {t("search.sectionVoiceActors")}
            </h2>
            {vaSearch && !vaLoading && (
              <span className="text-xs text-muted-foreground dark:text-white/35 font-mono">
                {t("search.vaResultsCount", { count: vaSearch.results.length })}
              </span>
            )}
          </div>

          {vaLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-xl border border-border dark:border-white/8 p-2.5 animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-muted/60 dark:bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted/50 dark:bg-white/[0.05]" />
                    <div className="h-2.5 w-1/2 rounded bg-muted/40 dark:bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : vaSearch && vaSearch.results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {vaSearch.results.map((va) => (
                <Link
                  key={va.id}
                  href={`${ROUTES.VOICE_ACTOR}/${va.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-2.5 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                    {va.image ? (
                      <Image src={va.image} alt={va.name} fill sizes="48px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-zinc-300">
                        <Mic className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground/90 dark:text-white/85 line-clamp-1 group-hover:text-zinc-200">
                      {va.name}
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30 line-clamp-1">
                      {[va.native, va.language].filter(Boolean).join(" · ") || t("search.voiceActor")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground dark:text-white/35 font-mono">
              {t("search.noVoiceActors", { query: displayPhrase })}
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default SearchResults;
