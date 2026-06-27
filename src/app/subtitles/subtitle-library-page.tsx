"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "react-query";
import Container from "@/components/container";
import SubtitleFeedCard, {
  SubtitleFeedCardSkeleton,
  SubtitleFeedPager,
} from "@/components/subtitles/subtitle-feed-card";
import {
  SubtitleCacheSidebar,
  SubtitleForumSidebar,
} from "@/components/subtitles/subtitle-library-sidebar";
import { ROUTES } from "@/constants/routes";
import {
  patchSubtitleLibraryCache,
  syncSubtitleLibrary,
  useDiscoverAnimeSearch,
  useSubtitleLibrary,
  useSubtitleLibraryStats,
  type SubtitleLibraryFilter,
  type SubtitleLibrarySort,
} from "@/query/get-subtitle-library";
import {
  downloadSubtitleEpisodesZip,
  fetchAllAnimeSubtitles,
  listAnimeSubtitleTracks,
} from "@/query/get-anime-subtitles";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Captions, Loader2, Search } from "lucide-react";

const SORT_OPTIONS: SubtitleLibrarySort[] = ["latest", "tracks", "progress", "az"];

function useStableOrder(
  items: SubtitleLibraryEntry[] | undefined,
  frozen: boolean,
): SubtitleLibraryEntry[] {
  const orderRef = useRef<number[]>([]);

  return useMemo(() => {
    const list = items ?? [];
    if (!frozen || orderRef.current.length === 0) {
      orderRef.current = list.map((i) => i.anilistId);
      return list;
    }

    const byId = new Map(list.map((i) => [i.anilistId, i]));
    const ordered: SubtitleLibraryEntry[] = [];
    for (const id of orderRef.current) {
      const found = byId.get(id);
      if (found) {
        ordered.push(found);
        byId.delete(id);
      }
    }
    for (const leftover of byId.values()) ordered.push(leftover);
    return ordered;
  }, [items, frozen]);
}

export default function SubtitleLibraryPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const qParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const filterParam: SubtitleLibraryFilter =
    searchParams.get("filter") === "completed" ? "completed" : "all";
  const sortParamRaw = searchParams.get("sort");
  const sortParam: SubtitleLibrarySort = SORT_OPTIONS.includes(
    sortParamRaw as SubtitleLibrarySort,
  )
    ? (sortParamRaw as SubtitleLibrarySort)
    : "latest";

  const [query, setQuery] = useState(qParam);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [fetchProgress, setFetchProgress] = useState<{
    id: number;
    done: number;
    total: number;
  } | null>(null);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoSyncDetail, setAutoSyncDetail] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const syncFailures = useRef(0);

  const SYNC_INTERVAL_MS = 5_000;

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  const { data: stats, isLoading: statsLoading } = useSubtitleLibraryStats();
  const { data: library, isLoading, isFetching, isError, refetch } = useSubtitleLibrary(
    qParam,
    pageParam,
    filterParam,
    sortParam,
  );
  const backfillAttempted = useRef(false);
  const { data: animeSearch, isLoading: animeSearchLoading } = useDiscoverAnimeSearch(qParam);

  const cachedIdSet = useMemo(
    () => new Set(library?.cachedAnilistIds ?? []),
    [library?.cachedAnilistIds],
  );

  const discoverAnimes = useMemo(() => {
    if (!animeSearch?.animes?.length) return [];
    return animeSearch.animes.filter((a) => {
      const id = parseInt(a.id, 10);
      return !Number.isNaN(id) && !cachedIdSet.has(id);
    });
  }, [animeSearch, cachedIdSet]);

  const totalPages = Math.max(1, Math.ceil((library?.total ?? 0) / (library?.limit ?? 24)));
  const showDiscover = qParam.trim().length >= 2;

  const rowBusy = downloadingId !== null || fetchingId !== null;
  const displayItems = useStableOrder(library?.items, rowBusy);

  const buildSubsUrl = (
    nextQ: string,
    nextPage: number,
    filter: SubtitleLibraryFilter,
    sort: SubtitleLibrarySort,
  ) => {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set("q", nextQ.trim());
    if (nextPage > 1) p.set("page", String(nextPage));
    if (filter === "completed") p.set("filter", "completed");
    if (sort !== "latest") p.set("sort", sort);
    const qs = p.toString();
    return `${ROUTES.SUBTITLES}${qs ? `?${qs}` : ""}`;
  };

  const pushParams = (
    nextQ: string,
    nextPage: number,
    filter: SubtitleLibraryFilter,
    sort: SubtitleLibrarySort = sortParam,
  ) => {
    router.replace(buildSubsUrl(nextQ, nextPage, filter, sort), { scroll: false });
  };

  const invalidateLibrary = () => {
    queryClient.invalidateQueries(["subtitle-library-stats"]);
    queryClient.invalidateQueries(["subtitle-library"]);
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, SYNC_INTERVAL_MS);
        return;
      }

      setAutoSyncing(true);
      try {
        const result = await syncSubtitleLibrary({
          limit: 1,
          mode: "auto",
          episodes: 1,
        });

        syncFailures.current = 0;
        setSyncError(false);

        if (result.stats) {
          queryClient.setQueryData(["subtitle-library-stats"], result.stats);
        }

        if (result.updatedEntries?.length) {
          patchSubtitleLibraryCache(queryClient, result.updatedEntries);
        }

        if (result.fetchedEpisodes > 0 || result.completed > 0) {
          setAutoSyncDetail(
            result.completed > 0
              ? t("subsLibrary.autoSyncComplete", { count: result.completed })
              : t("subsLibrary.autoSyncProgress", {
                  fetched: result.fetchedEpisodes,
                  remaining: result.remaining,
                }),
          );
        } else if (result.processed > 0) {
          setAutoSyncDetail(
            result.mode === "discover"
              ? t("subsLibrary.autoSyncDiscover")
              : t("subsLibrary.autoSyncFill"),
          );
        } else if (result.remaining === 0) {
          setAutoSyncDetail(t("subsLibrary.autoSyncIdle"));
        }

        if (
          result.fetchedEpisodes > 0 ||
          result.completed > 0 ||
          result.stats ||
          (result.updatedEntries?.length ?? 0) > 0
        ) {
          invalidateLibrary();
        }
      } catch {
        syncFailures.current += 1;
        if (syncFailures.current >= 3) setSyncError(true);
      } finally {
        setAutoSyncing(false);
        if (!cancelled) {
          timer = setTimeout(tick, SYNC_INTERVAL_MS);
        }
      }
    };

    timer = setTimeout(tick, 3_000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, t]);

  useEffect(() => {
    if (backfillAttempted.current || statsLoading || isLoading || qParam.trim()) return;
    if ((stats?.totalAnimes ?? 0) > 0 && (library?.total ?? 0) === 0) {
      backfillAttempted.current = true;
      void refetch();
    }
  }, [stats, library, statsLoading, isLoading, qParam, refetch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams(query, 1, filterParam);
  };

  const handleDownloadAll = async (anilistId: number) => {
    setDownloadingId(anilistId);
    try {
      await downloadSubtitleEpisodesZip(anilistId);
      toast.success(t("subsLibrary.downloadStarted"));
    } catch {
      toast.error(t("subsLibrary.downloadError"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFetchSubs = async (
    anilistId: number,
    totalEpisodes?: number | null,
  ) => {
    setFetchingId(anilistId);
    const total = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : 0;
    if (total > 0) setFetchProgress({ id: anilistId, done: 0, total });
    toast.loading(t("subsLibrary.fetching"), { id: `fetch-subs-${anilistId}` });

    let poll: ReturnType<typeof setInterval> | undefined;
    if (total > 0) {
      poll = setInterval(async () => {
        try {
          const rows = await listAnimeSubtitleTracks(anilistId);
          const done = new Set(rows.map((r) => r.episode)).size;
          setFetchProgress({ id: anilistId, done: Math.min(done, total), total });
        } catch {
          /* ignore poll errors */
        }
      }, 3_000);
    }

    try {
      const result = await fetchAllAnimeSubtitles(anilistId);
      toast.dismiss(`fetch-subs-${anilistId}`);
      if (result.tracks.length > 0) {
        toast.success(t("subsLibrary.fetchSuccess", { count: result.tracks.length }));
      } else {
        toast.info(t("subsLibrary.fetchEmpty"));
      }
      if (result.stats) {
        queryClient.setQueryData(["subtitle-library-stats"], result.stats);
      }
      if (result.libraryEntry) {
        patchSubtitleLibraryCache(queryClient, [result.libraryEntry]);
      }
      invalidateLibrary();
    } catch {
      toast.dismiss(`fetch-subs-${anilistId}`);
      toast.error(t("subsLibrary.fetchError"));
    } finally {
      if (poll) clearInterval(poll);
      setFetchProgress(null);
      setFetchingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="order-2 flex w-full shrink-0 flex-col gap-4 lg:order-1 lg:w-[272px]">
            <SubtitleForumSidebar />
            <SubtitleCacheSidebar stats={stats} loading={statsLoading} />
          </aside>

          <section className="order-1 min-w-0 flex-1 lg:order-2">
            <div className="mb-5">
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                {t("subsLibrary.title")}
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/35">
                {t("subsLibrary.subtitle")}
              </p>
              {autoSyncing && (
                <p className="mt-2 flex items-center gap-2 text-[11px] font-mono text-teal-400/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {autoSyncDetail ?? t("subsLibrary.autoSyncing")}
                </p>
              )}
              {!autoSyncing && autoSyncDetail && (
                <p className="mt-2 text-[11px] font-mono text-white/30">{autoSyncDetail}</p>
              )}
              {syncError && (
                <p className="mt-2 text-[11px] font-mono text-amber-400/70">
                  {t("subsLibrary.autoSyncError")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
                  {(["all", "completed"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => pushParams(qParam, 1, tab)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        filterParam === tab
                          ? "bg-white text-black"
                          : "text-white/45 hover:text-white/70",
                      )}
                    >
                      {tab === "all" ? t("subsLibrary.tabAll") : t("subsLibrary.tabCompleted")}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleSearch}
                  role="search"
                  className="relative min-w-0 flex-1 sm:min-w-[200px]"
                >
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("subsLibrary.searchPlaceholder")}
                    aria-label={t("subsLibrary.searchPlaceholder")}
                    maxLength={80}
                    className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-3 pr-9 text-[13px] text-white/80 outline-none transition-colors placeholder:text-white/25 focus:border-violet-500/30"
                  />
                  <button
                    type="submit"
                    aria-label={t("subsLibrary.search")}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-white/35 hover:text-white/60"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </form>

                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="subs-sort">
                    {t("subsLibrary.sortLabel")}
                  </label>
                  <select
                    id="subs-sort"
                    value={sortParam}
                    onChange={(e) =>
                      pushParams(qParam, 1, filterParam, e.target.value as SubtitleLibrarySort)
                    }
                    className="h-9 cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[12px] text-white/70 outline-none transition-colors focus:border-violet-500/30"
                  >
                    <option value="latest" className="bg-zinc-900 text-white">
                      {t("subsLibrary.sortLatest")}
                    </option>
                    <option value="tracks" className="bg-zinc-900 text-white">
                      {t("subsLibrary.sortTracks")}
                    </option>
                    <option value="progress" className="bg-zinc-900 text-white">
                      {t("subsLibrary.sortProgress")}
                    </option>
                    <option value="az" className="bg-zinc-900 text-white">
                      {t("subsLibrary.sortAZ")}
                    </option>
                  </select>
                  {isFetching && !isLoading && (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/30" />
                  )}
                </div>
              </div>

              <div className="subs-feed-grid mt-4 space-y-2">
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <SubtitleFeedCardSkeleton key={i} index={i} />
                  ))
                ) : isError ? (
                  <LibraryError onRetry={() => refetch()} />
                ) : displayItems.length > 0 ? (
                  displayItems.map((item, i) => (
                    <SubtitleFeedCard
                      key={item.anilistId}
                      item={item}
                      index={i}
                      downloading={downloadingId === item.anilistId}
                      fetching={fetchingId === item.anilistId}
                      progress={
                        fetchProgress?.id === item.anilistId
                          ? { done: fetchProgress.done, total: fetchProgress.total }
                          : undefined
                      }
                      onDownload={() => handleDownloadAll(item.anilistId)}
                      onFetch={() => handleFetchSubs(item.anilistId, item.totalEpisodes)}
                    />
                  ))
                ) : (
                  <EmptyLibrary hasQuery={!!qParam} filter={filterParam} />
                )}
              </div>

              {!isLoading && !isError && library && library.items.length > 0 && (
                <SubtitleFeedPager
                  page={pageParam}
                  totalPages={totalPages}
                  onPage={(p) => pushParams(qParam, p, filterParam)}
                />
              )}
            </div>

            {showDiscover && (
              <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 sm:p-4">
                <h2 className="text-[11px] font-mono uppercase tracking-widest text-white/30">
                  {t("subsLibrary.discoverSection")}
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/35">
                  {t("subsLibrary.discoverHint")}
                </p>

                <div className="mt-4 space-y-2">
                  {animeSearchLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <SubtitleFeedCardSkeleton key={i} index={i} />
                    ))
                  ) : discoverAnimes.length > 0 ? (
                    discoverAnimes.map((anime, i) => {
                      const anilistId = parseInt(anime.id, 10);
                      const totalEpisodes = anime.episodes?.sub ?? null;
                      const entry: SubtitleLibraryEntry = {
                        anilistId,
                        animeTitle: anime.name ?? null,
                        trackCount: 0,
                        episodeCount: 0,
                        lastFetched: null,
                        poster: anime.poster ?? null,
                        status: anime.status ?? null,
                        totalEpisodes,
                        year: anime.year ?? null,
                      };
                      return (
                        <SubtitleFeedCard
                          key={anime.id}
                          item={entry}
                          index={i}
                          discover
                          fetching={fetchingId === anilistId}
                          progress={
                            fetchProgress?.id === anilistId
                              ? { done: fetchProgress.done, total: fetchProgress.total }
                              : undefined
                          }
                          onFetch={() => handleFetchSubs(anilistId, totalEpisodes)}
                        />
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-5 py-8 text-center">
                      <p className="text-sm text-white/40">{t("subsLibrary.discoverEmpty")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </Container>
    </div>
  );
}

function LibraryError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-6 py-10 text-center">
      <p className="text-sm text-red-300/80">{t("subsLibrary.loadError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-8 rounded-lg border border-white/15 bg-white/10 px-4 text-[11px] font-semibold text-white/70 transition-colors hover:text-white"
      >
        {t("subsLibrary.retry")}
      </button>
    </div>
  );
}

function EmptyLibrary({
  hasQuery,
  filter,
}: {
  hasQuery: boolean;
  filter: SubtitleLibraryFilter;
}) {
  const t = useT();
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-12 text-center">
      <Captions className="mx-auto mb-4 h-10 w-10 text-white/15" />
      <p className="text-sm text-white/45">
        {filter === "completed"
          ? t("subsLibrary.emptyCompleted")
          : hasQuery
            ? t("subsLibrary.emptySearch")
            : t("subsLibrary.empty")}
      </p>
      {hasQuery && filter === "all" && (
        <p className="mt-2 text-xs text-white/30">{t("subsLibrary.emptySearchHint")}</p>
      )}
    </div>
  );
}
