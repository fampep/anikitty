"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "react-query";
import Container from "@/components/container";
import Pagination from "@/components/common/pagination";
import SubtitleAnimeCard from "@/components/subtitle-anime-card";
import DiscoverSubtitleCard from "@/components/discover-subtitle-card";
import { ROUTES } from "@/constants/routes";
import {
  syncSubtitleLibrary,
  useDiscoverAnimeSearch,
  useSubtitleLibrary,
  useSubtitleLibraryStats,
  type SubtitleLibraryFilter,
} from "@/query/get-subtitle-library";
import {
  downloadSubtitleEpisodesZip,
  fetchAllAnimeSubtitles,
} from "@/query/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Captions,
  CheckCircle2,
  Film,
  Loader2,
  Search,
  Subtitles,
} from "lucide-react";

export default function SubtitleLibraryPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const autoSyncStarted = useRef(false);

  const qParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const filterParam: SubtitleLibraryFilter =
    searchParams.get("filter") === "completed" ? "completed" : "all";

  const [query, setQuery] = useState(qParam);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [autoSyncing, setAutoSyncing] = useState(false);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  const { data: stats, isLoading: statsLoading } = useSubtitleLibraryStats();
  const { data: library, isLoading, isFetching, isError, refetch } = useSubtitleLibrary(
    qParam,
    pageParam,
    filterParam,
  );
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

  const buildSubsUrl = (
    nextQ: string,
    nextPage: number,
    filter: SubtitleLibraryFilter,
  ) => {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set("q", nextQ.trim());
    if (nextPage > 1) p.set("page", String(nextPage));
    if (filter === "completed") p.set("filter", "completed");
    const qs = p.toString();
    return `${ROUTES.SUBTITLES}${qs ? `?${qs}` : ""}`;
  };

  const pushParams = (nextQ: string, nextPage: number, filter: SubtitleLibraryFilter) => {
    router.replace(buildSubsUrl(nextQ, nextPage, filter), { scroll: false });
  };

  const invalidateLibrary = () => {
    queryClient.invalidateQueries(["subtitle-library-stats"]);
    queryClient.invalidateQueries(["subtitle-library"]);
  };

  useEffect(() => {
    if (autoSyncStarted.current) return;
    autoSyncStarted.current = true;

    const runAutoSync = async () => {
      await new Promise((r) => setTimeout(r, 3000));
      setAutoSyncing(true);
      let rounds = 0;
      try {
        while (rounds < 5) {
          const result = await syncSubtitleLibrary(1);
          if (result.processed === 0) break;
          rounds++;
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch {
        /* silent */
      } finally {
        setAutoSyncing(false);
        invalidateLibrary();
      }
    };

    void runAutoSync();
  }, [queryClient]);

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

  const handleFetchSubs = async (anilistId: number) => {
    setFetchingId(anilistId);
    toast.loading(t("subsLibrary.fetching"), { id: `fetch-subs-${anilistId}` });
    try {
      const tracks = await fetchAllAnimeSubtitles(anilistId);
      toast.dismiss(`fetch-subs-${anilistId}`);
      if (tracks.length > 0) {
        toast.success(t("subsLibrary.fetchSuccess", { count: tracks.length }));
      } else {
        toast.info(t("subsLibrary.fetchEmpty"));
      }
      invalidateLibrary();
    } catch {
      toast.dismiss(`fetch-subs-${anilistId}`);
      toast.error(t("subsLibrary.fetchError"));
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <Subtitles className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {t("subsLibrary.title")}
          </h1>
        </div>
        <p className="text-sm text-white/35 font-mono pl-[3.25rem] max-w-2xl leading-relaxed">
          {t("subsLibrary.subtitle")}
        </p>
        {autoSyncing && (
          <p className="text-[11px] font-mono text-teal-400/70 pl-[3.25rem] mt-2 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t("subsLibrary.autoSyncing")}
          </p>
        )}
      </Container>

      <Container className="mt-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label={t("subsLibrary.stats.animes")}
            value={stats?.totalAnimes}
            loading={statsLoading}
            icon={<Film className="w-4 h-4 text-violet-400/80" />}
          />
          <StatCard
            label={t("subsLibrary.stats.completed")}
            value={stats?.completedAnimes}
            loading={statsLoading}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400/80" />}
          />
          <StatCard
            label={t("subsLibrary.stats.tracks")}
            value={stats?.totalTracks}
            loading={statsLoading}
            icon={<Captions className="w-4 h-4 text-teal-400/80" />}
          />
        </div>

        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search className="absolute inset-y-0 left-3.5 m-auto h-4 w-4 text-white/30 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("subsLibrary.searchPlaceholder")}
            className="w-full h-11 pl-10 pr-24 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-white/25 transition-colors"
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-1.5 my-auto h-8 px-3.5 rounded-lg text-[11px] font-semibold bg-white text-black hover:bg-white/90 transition-colors"
          >
            {t("subsLibrary.search")}
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "completed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => pushParams(qParam, 1, tab)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors",
                filterParam === tab
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.03] text-white/45 border-white/10 hover:text-white/70",
              )}
            >
              {tab === "all" ? t("subsLibrary.tabAll") : t("subsLibrary.tabCompleted")}
            </button>
          ))}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
              {filterParam === "completed"
                ? t("subsLibrary.completedSection", { count: library?.total ?? 0 })
                : qParam
                  ? t("subsLibrary.cachedSection", { count: library?.total ?? 0 })
                  : t("subsLibrary.cachedBrowse")}
            </h2>
            {isFetching && !isLoading && (
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
            )}
          </div>

          {isLoading ? (
            <CardGridSkeleton />
          ) : isError ? (
            <LibraryError onRetry={() => refetch()} />
          ) : library && library.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {library.items.map((item) => (
                  <SubtitleAnimeCard
                    key={item.anilistId}
                    item={item}
                    downloading={downloadingId === item.anilistId}
                    fetching={fetchingId === item.anilistId}
                    onDownload={() => handleDownloadAll(item.anilistId)}
                    onFetch={() => handleFetchSubs(item.anilistId)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={pageParam}
                  totalPages={totalPages}
                  handlePreviousPage={() => pushParams(qParam, pageParam - 1, filterParam)}
                  handleNextPage={() => pushParams(qParam, pageParam + 1, filterParam)}
                  handlePageChange={(p) => pushParams(qParam, p, filterParam)}
                />
              )}
            </>
          ) : (
            <EmptyLibrary hasQuery={!!qParam} filter={filterParam} />
          )}
        </section>

        {showDiscover && (
          <section className="space-y-4">
            <h2 className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
              {t("subsLibrary.discoverSection")}
            </h2>
            <p className="text-xs text-white/35 max-w-2xl leading-relaxed">
              {t("subsLibrary.discoverHint")}
            </p>

            {animeSearchLoading ? (
              <CardGridSkeleton count={6} />
            ) : discoverAnimes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {discoverAnimes.map((anime) => (
                  <DiscoverSubtitleCard
                    key={anime.id}
                    anime={anime}
                    fetching={fetchingId === parseInt(anime.id, 10)}
                    onFetch={() => handleFetchSubs(parseInt(anime.id, 10))}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-8 text-center">
                <p className="text-sm text-white/40">{t("subsLibrary.discoverEmpty")}</p>
              </div>
            )}
          </section>
        )}
      </Container>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-5 py-4 flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04] border border-white/8 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
          {loading ? "—" : (value ?? 0).toLocaleString()}
        </p>
      </div>
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
        className="mt-4 h-8 px-4 rounded-lg text-[11px] font-semibold bg-white/10 border border-white/15 text-white/70 hover:text-white transition-colors"
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
      <Captions className="w-10 h-10 text-white/15 mx-auto mb-4" />
      <p className="text-sm text-white/45">
        {filter === "completed"
          ? t("subsLibrary.emptyCompleted")
          : hasQuery
            ? t("subsLibrary.emptySearch")
            : t("subsLibrary.empty")}
      </p>
      {hasQuery && filter === "all" && (
        <p className="text-xs text-white/30 mt-2">{t("subsLibrary.emptySearchHint")}</p>
      )}
    </div>
  );
}

function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 max-w-[12.625rem] mx-auto w-full">
          <div className="aspect-[2/3] rounded-xl border border-white/8 bg-white/[0.02] animate-pulse" />
          <div className="h-7 rounded-lg bg-white/[0.04] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
