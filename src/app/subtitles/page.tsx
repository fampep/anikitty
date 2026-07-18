"use client";

import React, { useEffect, useState } from "react";
import { Captions, Loader2, Search } from "lucide-react";
import Container from "@/components/layout/container";
import SubtitleLibraryCard from "@/components/subtitles/subtitle-library-card";
import CommunityHero from "@/components/community/community-hero";
import { useSubtitleLibrary, type SubtitleLibraryFilter } from "@/query/subtitles/get-subtitle-library";
import type { SubtitleLibrarySort } from "@/lib/subtitles/subtitle-library-db";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const SORT_OPTIONS: SubtitleLibrarySort[] = ["latest", "tracks", "progress", "az"];

const SORT_LABEL_KEYS: Record<SubtitleLibrarySort, "subsLibrary.sortLatest" | "subsLibrary.sortTracks" | "subsLibrary.sortProgress" | "subsLibrary.sortAZ"> = {
  latest: "subsLibrary.sortLatest",
  tracks: "subsLibrary.sortTracks",
  progress: "subsLibrary.sortProgress",
  az: "subsLibrary.sortAZ",
};

export default function SubtitlesPage() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<SubtitleLibraryFilter>("all");
  const [sort, setSort] = useState<SubtitleLibrarySort>("latest");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, filter, sort]);

  const { data, isLoading, isError, isFetching, refetch } = useSubtitleLibrary({
    q: debouncedQ || undefined,
    page,
    filter,
    sort,
    limit: 24,
  });

  const stats = data?.stats;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNextPage = data?.hasNextPage ?? false;

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="flex flex-col gap-8">
        <CommunityHero
          icon={<Captions className="w-5 h-5" />}
          title={t("subsLibrary.title")}
          subtitle={t("subsLibrary.subtitle")}
          className="border-teal-500/15 from-teal-500/10"
        />

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t("subsLibrary.stats.animes")}
              value={stats.totalAnimes.toLocaleString()}
              accent="teal"
            />
            <StatCard
              label={t("subsLibrary.stats.tracks")}
              value={stats.totalTracks.toLocaleString()}
              accent="sky"
            />
            <StatCard
              label={t("subsLibrary.stats.completed")}
              value={stats.completedAnimes.toLocaleString()}
              accent="violet"
            />
            {stats.subsProviderCount != null && stats.subsProviderCount > 0 && (
              <StatCard
                label={t("subsLibrary.stats.providers")}
                value={stats.subsProviderCount.toLocaleString()}
                accent="teal"
              />
            )}
          </div>
        )}

        {stats && stats.totalEpisodes > 0 && (
          <div className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30">
                {t("subsLibrary.episodeCoverageMeta", {
                  cached: stats.cachedEpisodes,
                  total: stats.totalEpisodes,
                })}
              </span>
              <span className="text-[11px] font-mono text-teal-300/70">
                {Math.round((stats.cachedEpisodes / stats.totalEpisodes) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-accent dark:bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400"
                style={{
                  width: `${Math.min(100, Math.round((stats.cachedEpisodes / stats.totalEpisodes) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "completed"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                    filter === tab
                      ? "bg-teal-500/15 border-teal-500/30 text-teal-200"
                      : "bg-muted/40 dark:bg-white/[0.03] border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:text-muted-foreground dark:text-white/70",
                  )}
                >
                  {tab === "all" ? t("subsLibrary.tabAll") : t("subsLibrary.tabCompleted")}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground dark:text-white/40 font-mono">
                <span className="hidden sm:inline">{t("subsLibrary.sortLabel")}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SubtitleLibrarySort)}
                  className="h-8 rounded-lg bg-black/40 border border-border dark:border-white/10 text-foreground/85 dark:text-white/75 text-xs px-2 outline-none focus:border-teal-500/30"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(SORT_LABEL_KEYS[opt])}
                    </option>
                  ))}
                </select>
              </label>

              <div className="relative flex-1 min-w-[200px] lg:w-64 lg:flex-none">
                <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-muted-foreground dark:text-white/30 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("subsLibrary.searchPlaceholder")}
                  className="h-9 w-full pl-8 pr-3 text-xs rounded-lg bg-muted dark:bg-black/30 border border-border dark:border-white/10 text-foreground/85 dark:text-white/75 placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 outline-none focus:border-teal-500/30"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-mono text-muted-foreground dark:text-white/35">
              {isLoading ? t("subsLibrary.loading") : t("subsLibrary.resultsCount", { count: total })}
            </p>
            <div className="flex items-center gap-2">
              {isFetching && !isLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground dark:text-white/30" />
              )}
            </div>
          </div>

          {isError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-8 text-center">
              <p className="text-sm text-red-200/80">{t("subsLibrary.loadError")}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 text-xs font-semibold text-red-200/90 hover:text-red-100"
              >
                {t("subsLibrary.retry")}
              </button>
            </div>
          )}

          {!isError && !isLoading && items.length === 0 && (
            <div className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-4 py-12 text-center">
              <Captions className="w-8 h-8 text-muted-foreground/50 dark:text-white/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">
                {debouncedQ ? t("subsLibrary.emptySearch") : t("subsLibrary.empty")}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
              {items.map((entry) => (
                <SubtitleLibraryCard key={entry.anilistId} entry={entry} />
              ))}
            </div>
          )}

          {(page > 1 || hasNextPage) && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:text-foreground/90 dark:text-white/80 disabled:opacity-40"
              >
                {t("subsLibrary.pagerPrev")}
              </button>
              <span className="text-[11px] font-mono text-muted-foreground dark:text-white/30">{page}</span>
              <button
                type="button"
                disabled={!hasNextPage || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:text-foreground/90 dark:text-white/80 disabled:opacity-40"
              >
                {t("subsLibrary.pagerNext")}
              </button>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "teal" | "sky" | "violet";
}) {
  const accentClass =
    accent === "teal"
      ? "border-teal-500/20 bg-teal-500/[0.06] text-teal-200"
      : accent === "sky"
        ? "border-sky-500/20 bg-sky-500/[0.06] text-sky-200"
        : "border-primary/20 bg-primary/[0.06] text-zinc-200";

  return (
    <div className={cn("rounded-xl border px-4 py-3", accentClass)}>
      <p className="text-[10px] font-mono uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-2xl font-black tabular-nums mt-1">{value}</p>
    </div>
  );
}
