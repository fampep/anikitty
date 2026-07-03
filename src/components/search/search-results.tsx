"use client";

import React from "react";
import { ROUTES } from "@/constants/routes";
import AnimeCard from "@/components/anime/anime-card";
import BlurFade from "@/components/ui/blur-fade";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetSearchAnimeResults } from "@/query/search/get-search-results";
import Pagination from "@/components/common/pagination";
import { useAnimeSearchParams } from "@/hooks/use-anime-search-params";
import { useFilterLabels } from "@/hooks/use-filter-labels";
import { useT } from "@/providers/i18n-provider";
import Select from "@/components/common/select";
import { SearchAnimeParams } from "@/types/anime";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/core/utils";
import SearchBar from "@/components/layout/search-bar";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SlidersHorizontal, RotateCcw, Search, RefreshCw } from "lucide-react";

const SearchResults = () => {
  const t = useT();
  const filterLabels = useFilterLabels();
  const params = useAnimeSearchParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const displayPhrase = params.q.replace(/^"+|"+$/g, "").trim();

  const { data: searchResults, isLoading, isError, refetch, isFetching } = useGetSearchAnimeResults(params);

  const [filters, setFilters] = React.useState<SearchAnimeParams>({
    q: params.q,
    page: params.page,
    type: params.type,
    status: params.status,
    rated: params.rated,
    season: params.season,
    language: params.language,
    sort: params.sort,
    genres: params.genres,
  });

  React.useEffect(() => {
    setFilters({
      q: params.q,
      page: params.page,
      type: params.type,
      status: params.status,
      rated: params.rated,
      season: params.season,
      language: params.language,
      sort: params.sort,
      genres: params.genres,
    });
  }, [params.q, params.page, params.type, params.status, params.rated, params.season, params.language, params.sort, params.genres]);

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

  const onChange = (key: keyof typeof filters, value: string) => {
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

  const [debouncedFilters, setDebouncedFilters] = React.useState(filters);

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedFilters(filters), 400);
    return () => window.clearTimeout(id);
  }, [filters.type, filters.status, filters.season, filters.sort, filters.genres, filters]);

  React.useEffect(() => {
    if (isMobile) return;
    const changed =
      debouncedFilters.type !== params.type ||
      debouncedFilters.status !== params.status ||
      debouncedFilters.season !== params.season ||
      debouncedFilters.sort !== params.sort ||
      debouncedFilters.genres !== params.genres;
    if (!changed) return;
    applyFilters({ ...debouncedFilters, page: 1 });
  }, [
    debouncedFilters.type,
    debouncedFilters.status,
    debouncedFilters.season,
    debouncedFilters.sort,
    debouncedFilters.genres,
    debouncedFilters,
    params.type,
    params.status,
    params.season,
    params.sort,
    params.genres,
    applyFilters,
    isMobile,
  ]);

  const resetFilters = () => {
    const cleared = { q: "", page: 1, type: "", status: "", rated: "", season: "", language: "", sort: "", genres: "" };
    setFilters(cleared);
    router.push("/search");
  };

  const activeFilterCount = [
    filters.type && filters.type !== "all",
    filters.status,
    filters.season,
    filters.sort && filters.sort !== "default",
    filters.genres,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-8 mt-28 lg:mt-36 pb-20 min-h-[75vh]">
      <div className="max-w-2xl">
        <SearchBar
          key={displayPhrase}
          defaultValue={displayPhrase}
          onSubmitQuery={(q) => applyFilters(filters, q)}
        />
      </div>

      {/* Filter panel */}
      <div className="bg-white/4 border border-white/10 backdrop-blur-sm rounded-xl p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-white/50" />
            <span className="text-sm font-semibold text-white/80">{t("search.filters")}</span>
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {t("search.reset")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select options={filterLabels.types} placeholder={t("search.placeholders.type")} value={filters.type || ""} onChange={(val) => onChange("type", val)} />
          <Select options={filterLabels.statuses} placeholder={t("search.placeholders.status")} value={filters.status || ""} onChange={(val) => onChange("status", val)} />
          <Select options={filterLabels.seasons} placeholder={t("search.placeholders.season")} value={filters.season || ""} onChange={(val) => onChange("season", val)} />
          <Select options={filterLabels.sort} placeholder={t("search.placeholders.sort")} value={filters.sort || ""} onChange={(val) => onChange("sort", val)} />
        </div>

        <div>
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{t("search.genres")}</p>
          <ToggleGroup
            type="multiple"
            className="flex flex-wrap justify-start gap-1.5"
            value={filters.genres?.split(",").filter(Boolean) || []}
            onValueChange={(value) => onChange("genres", value.filter(Boolean).join(","))}
          >
            {filterLabels.genres.map((genre) => (
              <ToggleGroupItem
                value={genre.value}
                key={genre.value}
                size="sm"
                className={cn(
                  "border border-white/15 text-white/35 hover:border-white/30 hover:text-white/60 hover:bg-white/6 text-xs h-7 px-2.5 rounded-full transition-colors",
                  "data-[state=on]:border-white/40 data-[state=on]:text-white/90 data-[state=on]:bg-white/12",
                )}
              >
                {genre.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <button
          onClick={() => applyFilters(filters)}
          className="self-start flex items-center gap-2 bg-white/10 text-white hover:bg-white/15 border border-white/10 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors lg:hidden"
        >
          <Search className="h-3.5 w-3.5" />
          {t("search.apply")}
        </button>
        <p className="hidden lg:block text-[11px] text-white/25 font-mono">
          {t("search.filtersAutoApply")}
        </p>
      </div>

      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 bg-white/50 rounded-full" />
        <h1 className="text-xl font-bold text-white/90">
          {displayPhrase === "" ? (
            t("search.browseAnime")
          ) : (
            t("search.resultsFor", { query: displayPhrase })
          )}
        </h1>
        {searchResults && !isLoading && (
          <span className="text-xs text-white/35 font-mono">
            {t("search.pageOf", { current: searchResults.currentPage, total: searchResults.totalPages })}
          </span>
        )}
      </div>

      {/* Grid */}
      {isError && !searchResults ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-sm text-white/40 font-mono">{t("search.loadError")}</p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-white/70 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            {t("common.tryAgain")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl h-[15rem] md:h-[18rem] animate-pulse bg-white/6"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
          {searchResults?.animes.map((anime, idx) => (
            <BlurFade key={anime.id} delay={idx * 0.04} inView>
              <AnimeCard
                title={anime.name}
                subTitle={anime.type}
                poster={anime.poster}
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="self-center justify-self-center w-full"
                showGenre={false}
                episodeCard
                sub={anime.episodes?.sub}
                dub={anime.episodes?.dub}
                score={anime.score}
                year={anime.year}
                status={anime.status}
              />
            </BlurFade>
          ))}
          {searchResults?.animes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">🐱</span>
              <p className="text-white/50 font-medium">{t("search.noResults")}</p>
              <p className="text-white/35 text-sm mt-1">{t("search.noResultsHint")}</p>
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
    </div>
  );
};

export default SearchResults;
