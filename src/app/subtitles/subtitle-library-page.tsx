"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/container";
import Pagination from "@/components/common/pagination";
import { ROUTES } from "@/constants/routes";
import { useSubtitleLibrary, useSubtitleLibraryStats } from "@/query/get-subtitle-library";
import { downloadSubtitleEpisodesZip } from "@/query/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Captions,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Search,
  Subtitles,
} from "lucide-react";

export default function SubtitleLibraryPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [query, setQuery] = useState(qParam);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  const { data: stats, isLoading: statsLoading } = useSubtitleLibraryStats();
  const { data: library, isLoading, isFetching } = useSubtitleLibrary(qParam, pageParam);

  const totalPages = Math.max(1, Math.ceil((library?.total ?? 0) / (library?.limit ?? 24)));

  const pushParams = (nextQ: string, nextPage: number) => {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set("q", nextQ.trim());
    if (nextPage > 1) p.set("page", String(nextPage));
    const qs = p.toString();
    router.push(`${ROUTES.SUBTITLES}${qs ? `?${qs}` : ""}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushParams(query, 1);
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
      </Container>

      <Container className="mt-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label={t("subsLibrary.stats.animes")}
            value={stats?.totalAnimes}
            loading={statsLoading}
            icon={<Film className="w-4 h-4 text-violet-400/80" />}
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

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
            {library
              ? t("subsLibrary.resultsCount", { count: library.total })
              : t("subsLibrary.loading")}
          </p>
          {isFetching && !isLoading && (
            <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-white/8 bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        ) : library && library.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {library.items.map((item) => (
                <AnimeSubCard
                  key={item.anilistId}
                  item={item}
                  downloading={downloadingId === item.anilistId}
                  onDownload={() => handleDownloadAll(item.anilistId)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={pageParam}
                totalPages={totalPages}
                handlePreviousPage={() => pushParams(qParam, pageParam - 1)}
                handleNextPage={() => pushParams(qParam, pageParam + 1)}
                handlePageChange={(p) => pushParams(qParam, p)}
              />
            )}
          </>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-16 text-center">
            <Captions className="w-10 h-10 text-white/15 mx-auto mb-4" />
            <p className="text-sm text-white/45">
              {qParam ? t("subsLibrary.emptySearch") : t("subsLibrary.empty")}
            </p>
          </div>
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

function AnimeSubCard({
  item,
  downloading,
  onDownload,
}: {
  item: {
    anilistId: number;
    animeTitle: string | null;
    trackCount: number;
    episodeCount: number;
    lastFetched: string | null;
  };
  downloading: boolean;
  onDownload: () => void;
}) {
  const t = useT();
  const title = item.animeTitle?.trim() || t("subsLibrary.unknownAnime", { id: item.anilistId });

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col gap-4 hover:border-white/14 transition-colors">
      <div className="min-w-0">
        <Link
          href={`${ROUTES.ANIME_DETAILS}/${item.anilistId}?tab=subtitles`}
          className="text-sm font-semibold text-white/90 hover:text-white line-clamp-2 transition-colors"
        >
          {title}
        </Link>
        <p className="text-[10px] font-mono text-white/25 mt-1">
          AniList #{item.anilistId}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.04] border border-white/8 text-white/45">
          {t("subsLibrary.episodesCached", { count: item.episodeCount })}
        </span>
        <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-300/80">
          {t("subsLibrary.tracksCached", { count: item.trackCount })}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-1">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 flex-1 h-8 rounded-lg text-[11px] font-semibold",
            "bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50",
          )}
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {t("subsLibrary.downloadAll")}
        </button>
        <Link
          href={`${ROUTES.ANIME_DETAILS}/${item.anilistId}?tab=subtitles`}
          className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-[11px] font-semibold border border-white/10 text-white/50 hover:text-white/75 hover:bg-white/[0.04] transition-colors"
          title={t("subsLibrary.browse")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
