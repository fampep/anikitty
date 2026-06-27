"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Loader2,
  Mic,
  Captions,
  Search,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import {
  downloadEpisodeVideo,
  downloadEpisodeVideosBatch,
  VideoDownloadDisabledError,
} from "@/query/download-episode-video";
import { KITTY_PROVIDERS, type KittyProvider } from "@/query/get-kitty-stream";
import { VIDEO_DOWNLOAD_ENABLED } from "@/lib/video-download-config";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";

const EPISODES_PER_PAGE = 10;
const DEFAULT_PROVIDER: KittyProvider = "Miruro";

type Props = {
  anilistId: number;
  hasDub?: boolean;
};

type EpisodeRow = {
  number: number;
  title: string;
  image?: string | null;
};

export default function AnimeMediaDownloads({ anilistId, hasDub = false }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState<KittyProvider>(DEFAULT_PROVIDER);
  const [preferDub, setPreferDub] = useState(false);
  const [selectedEps, setSelectedEps] = useState<Set<number>>(() => new Set());
  const [downloadingEp, setDownloadingEp] = useState<number | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const audio: "sub" | "dub" = preferDub && hasDub ? "dub" : "sub";

  const { data: episodesData, isLoading: episodesLoading } = useGetAllEpisodes(String(anilistId));

  const allEpisodes = useMemo(() => episodesData?.episodes ?? [], [episodesData]);

  const filteredEpisodes = useMemo(() => {
    if (!query.trim()) return allEpisodes;
    const lower = query.toLowerCase();
    return allEpisodes.filter(
      (ep) =>
        ep.number.toString().includes(lower) || ep.title.toLowerCase().includes(lower),
    );
  }, [allEpisodes, query]);

  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
    setSelectedEps(new Set());
  }, [query, anilistId, provider, audio]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageEpisodes: EpisodeRow[] = useMemo(() => {
    const start = (safePage - 1) * EPISODES_PER_PAGE;
    return filteredEpisodes.slice(start, start + EPISODES_PER_PAGE).map((ep) => ({
      number: ep.number,
      title: ep.title,
      image: ep.image,
    }));
  }, [filteredEpisodes, safePage]);

  const busy = downloadingEp !== null || batchDownloading;

  const handleDownloadEpisode = async (episode: number) => {
    setDownloadingEp(episode);
    try {
      await downloadEpisodeVideo(anilistId, episode, audio, provider);
      toast.success(t("anime.media.downloadSuccess", { n: episode }));
    } catch (err) {
      if (err instanceof VideoDownloadDisabledError) {
        toast.info(t("download.videoTemporarilyDisabled"));
      } else {
        toast.error(t("anime.media.downloadError", { n: episode }));
      }
    } finally {
      setDownloadingEp(null);
    }
  };

  const handleDownloadSelected = async () => {
    const eps = [...selectedEps].sort((a, b) => a - b);
    if (eps.length === 0) return;

    setBatchDownloading(true);
    try {
      const { ok, failed } = await downloadEpisodeVideosBatch(
        anilistId,
        eps,
        audio,
        provider,
        (current, total, ep) => {
          toast.loading(t("anime.media.batchProgress", { current, total, n: ep }), {
            id: "media-batch",
          });
        },
      );
      toast.dismiss("media-batch");
      if (ok > 0) {
        toast.success(t("anime.media.batchSuccess", { ok, failed }));
      } else {
        toast.error(t("anime.media.batchFailed"));
      }
    } catch (err) {
      toast.dismiss("media-batch");
      if (err instanceof VideoDownloadDisabledError) {
        toast.info(t("download.videoTemporarilyDisabled"));
      } else {
        toast.error(t("anime.media.batchFailed"));
      }
    } finally {
      setBatchDownloading(false);
    }
  };

  const toggleEpisodeSelection = (episode: number) => {
    setSelectedEps((prev) => {
      const next = new Set(prev);
      if (next.has(episode)) next.delete(episode);
      else next.add(episode);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedEps((prev) => new Set([...prev, ...pageEpisodes.map((e) => e.number)]));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            {t("anime.media.heading")}
          </h3>
          <p className="text-xs text-white/40 mt-1.5 max-w-xl leading-relaxed">
            {t("anime.media.description")}
          </p>
          {!VIDEO_DOWNLOAD_ENABLED && (
            <p className="text-xs text-amber-400/80 mt-2 max-w-xl leading-relaxed">
              {t("download.videoTemporarilyDisabled")}
            </p>
          )}
          {allEpisodes.length > 0 && (
            <p className="text-[11px] font-mono text-white/25 mt-2">
              {t("anime.media.episodeCount", { total: allEpisodes.length })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-white/30" />
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as KittyProvider)}
              disabled={busy}
              className="h-8 px-2 text-[11px] font-mono rounded-lg bg-white/4 border border-white/10 text-white/75 outline-none focus:border-white/25"
            >
              {KITTY_PROVIDERS.map((p) => (
                <option key={p} value={p} className="bg-[#111]">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-lg overflow-hidden border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreferDub(false)}
              className={cn(
                "flex items-center gap-1 h-8 px-2.5 text-[11px] font-bold transition-all",
                !preferDub ? "bg-white text-black" : "text-white/40 hover:text-white/65",
              )}
            >
              <Captions className="w-3 h-3" /> {t("card.sub")}
            </button>
            <div className="w-px h-4 bg-white/12" />
            <button
              type="button"
              disabled={busy || !hasDub}
              onClick={() => setPreferDub(true)}
              className={cn(
                "flex items-center gap-1 h-8 px-2.5 text-[11px] font-bold transition-all",
                preferDub ? "bg-white text-black" : "text-white/40 hover:text-white/65",
                !hasDub && "opacity-40 cursor-not-allowed",
              )}
            >
              <Mic className="w-3 h-3" /> {t("card.dub")}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              value={query}
              placeholder={t("anime.media.searchPlaceholder")}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg bg-white/4 border border-white/10 text-white/75 placeholder:text-white/25 outline-none focus:border-white/25 w-52"
            />
          </div>
        </div>
      </div>

      {episodesLoading && allEpisodes.length === 0 ? (
        <EpisodeSkeletons />
      ) : pageEpisodes.length > 0 ? (
        <>
          <BatchBar
            selectedCount={selectedEps.size}
            pageCount={pageEpisodes.length}
            downloading={batchDownloading}
            onSelectPage={selectAllOnPage}
            onClear={() => setSelectedEps(new Set())}
            onDownloadSelected={handleDownloadSelected}
          />

          <div className="flex flex-col gap-3">
            {pageEpisodes.map((ep) => (
              <EpisodeDownloadCard
                key={ep.number}
                episode={ep}
                selected={selectedEps.has(ep.number)}
                busy={busy}
                downloading={downloadingEp === ep.number}
                onToggleSelect={() => toggleEpisodeSelection(ep.number)}
                onDownload={() => handleDownloadEpisode(ep.number)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-12 text-center">
          <Film className="w-8 h-8 text-white/15 mx-auto mb-4" />
          <p className="text-sm text-white/45">{t("anime.media.empty")}</p>
        </div>
      )}
    </div>
  );
}

function BatchBar({
  selectedCount,
  pageCount,
  downloading,
  onSelectPage,
  onClear,
  onDownloadSelected,
}: {
  selectedCount: number;
  pageCount: number;
  downloading: boolean;
  onSelectPage: () => void;
  onClear: () => void;
  onDownloadSelected: () => void;
}) {
  const t = useT();

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onSelectPage}
          disabled={downloading || pageCount === 0}
          className="text-[11px] font-medium text-white/45 hover:text-white/70 disabled:opacity-40"
        >
          {t("anime.subtitles.selectAllPage")}
        </button>
        {selectedCount > 0 && (
          <>
            <span className="text-white/15">·</span>
            <button
              type="button"
              onClick={onClear}
              disabled={downloading}
              className="text-[11px] font-medium text-white/45 hover:text-white/70"
            >
              {t("anime.subtitles.clearSelection")}
            </button>
            <span className="text-[10px] font-mono text-white/25">
              {t("anime.subtitles.selectedCount", { count: selectedCount })}
            </span>
          </>
        )}
      </div>
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onDownloadSelected}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {t("anime.media.downloadSelected", { count: selectedCount })}
        </button>
      )}
    </div>
  );
}

function EpisodeDownloadCard({
  episode,
  selected,
  busy,
  downloading,
  onToggleSelect,
  onDownload,
}: {
  episode: EpisodeRow;
  selected: boolean;
  busy: boolean;
  downloading: boolean;
  onToggleSelect: () => void;
  onDownload: () => void;
}) {
  const t = useT();

  return (
    <div
      className={cn(
        "rounded-xl border bg-white/[0.02] overflow-hidden transition-colors",
        selected ? "border-violet-500/35 ring-1 ring-violet-500/15" : "border-white/8",
      )}
    >
      <div className="flex gap-0">
        <div className="relative w-40 sm:w-44 shrink-0 aspect-[16/9] border-r border-white/6 overflow-hidden">
          <button
            type="button"
            onClick={onToggleSelect}
            disabled={busy}
            className={cn(
              "absolute top-2 left-2 z-20 w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
              selected
                ? "bg-violet-500 border-violet-400 text-white"
                : "bg-black/55 border-white/25 text-transparent hover:border-white/45",
            )}
            aria-label={`Select episode ${episode.number}`}
          >
            {selected && <span className="text-[10px] font-bold leading-none">✓</span>}
          </button>
          <EpisodeThumbnail image={episode.image} episode={episode.number} />
          {downloading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <Loader2 className="w-5 h-5 text-violet-300 animate-spin" />
            </div>
          )}
          <span className="absolute bottom-1.5 left-1.5 z-[1] text-[9px] font-mono font-bold text-white/90 bg-black/65 px-1.5 py-0.5 rounded">
            EP {episode.number}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/85 truncate">
              {t("anime.subtitles.episodeLabel", { n: episode.number })}
              {episode.title !== `Episode ${episode.number}` && (
                <span className="text-white/40 font-normal"> — {episode.title}</span>
              )}
            </p>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              {downloading ? t("anime.media.downloading") : t("anime.media.ready")}
            </p>
          </div>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-50 shrink-0"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {t("anime.media.downloadEpisode")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EpisodeThumbnail({ image, episode }: { image?: string | null; episode: number }) {
  return (
    <div className="absolute inset-0 bg-[#0d0d0d]">
      {image ? (
        <Image
          src={image}
          alt={`Episode ${episode}`}
          fill
          className="object-cover"
          unoptimized
          sizes="160px"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
          <Film className="w-8 h-8 text-white/10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useT();

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/50 hover:text-white/75 disabled:opacity-30"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        {t("anime.subtitles.prevPage")}
      </button>
      <span className="text-[11px] font-mono text-white/35">
        {t("anime.subtitles.pageInfo", { page, total: totalPages })}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/50 hover:text-white/75 disabled:opacity-30"
      >
        {t("anime.subtitles.nextPage")}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EpisodeSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: EPISODES_PER_PAGE }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden animate-pulse flex"
        >
          <div className="w-40 sm:w-44 shrink-0 aspect-[16/9] bg-white/6" />
          <div className="flex-1 p-4 flex flex-col gap-2 justify-center">
            <div className="h-4 w-40 rounded bg-white/6" />
            <div className="h-3 w-24 rounded bg-white/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
