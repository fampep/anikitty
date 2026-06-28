"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Captions,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import {
  fetchAllAnimeSubtitles,
  fetchAnimeEpisodeSubtitles,
  downloadSubtitleEpisodesZip,
  useGetAnimeSubtitles,
  type AnimeSubtitleItem,
} from "@/query/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { SUBTITLE_SOURCE_PROVIDER } from "@/lib/subtitle-track-utils";
import { parseVttCues, formatCueTime } from "@/lib/vtt-parse";
import { api } from "@/lib/api";

const EPISODES_PER_PAGE = 10;

type Props = {
  anilistId: number;
};

type EpisodeRow = {
  number: number;
  title: string;
  image?: string | null;
  tracks: AnimeSubtitleItem[];
};

export default function AnimeSubtitles({ anilistId }: Props) {
  const t = useT();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showMissingOnly, setShowMissingOnly] = useState(
    () => searchParams.get("missing") === "1",
  );
  const [fetchingEp, setFetchingEp] = useState<number | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [selectedEps, setSelectedEps] = useState<Set<number>>(() => new Set());
  const [downloadingZip, setDownloadingZip] = useState(false);

  const { data: episodesData, isLoading: episodesLoading } = useGetAllEpisodes(String(anilistId));
  const { data: subtitles = [], isLoading: subtitlesLoading, refetch } = useGetAnimeSubtitles(anilistId);

  const tracksByEpisode = useMemo(() => {
    const map = new Map<number, AnimeSubtitleItem[]>();
    for (const track of subtitles) {
      const list = map.get(track.episode) ?? [];
      list.push(track);
      map.set(track.episode, list);
    }
    for (const [ep, list] of map) {
      map.set(ep, list.sort((a, b) => a.label.localeCompare(b.label)));
    }
    return map;
  }, [subtitles]);

  const allEpisodes = useMemo(() => {
    const fromApi = episodesData?.episodes ?? [];
    if (fromApi.length > 0) return fromApi;

    return Array.from(tracksByEpisode.keys())
      .sort((a, b) => a - b)
      .map((n) => ({ number: n, title: `Episode ${n}`, image: null as string | null }));
  }, [episodesData, tracksByEpisode]);

  const totalEpisodes = allEpisodes.length;
  const cachedEpisodes = tracksByEpisode.size;
  const missingCount = totalEpisodes - cachedEpisodes;

  const missingEpisodes = useMemo(() => {
    if (totalEpisodes <= 0) return [];
    const missing: number[] = [];
    for (const ep of allEpisodes) {
      if (!tracksByEpisode.has(ep.number)) missing.push(ep.number);
    }
    return missing;
  }, [allEpisodes, tracksByEpisode, totalEpisodes]);

  const filteredEpisodes = useMemo(() => {
    const missingSet =
      showMissingOnly && missingEpisodes.length > 0 ? new Set(missingEpisodes) : null;

    return allEpisodes.filter((ep) => {
      if (missingSet && !missingSet.has(ep.number)) return false;

      if (!query.trim()) return true;

      const lower = query.toLowerCase();
      return (
        ep.number.toString().includes(lower) ||
        ep.title.toLowerCase().includes(lower) ||
        (tracksByEpisode.get(ep.number) ?? []).some((tr) =>
          tr.label.toLowerCase().includes(lower),
        )
      );
    });
  }, [allEpisodes, query, tracksByEpisode, showMissingOnly, missingEpisodes]);

  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
    setSelectedEps(new Set());
  }, [query, anilistId, showMissingOnly]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/^#ep-(\d+)$/);

    if (searchParams.get("missing") === "1" || match) {
      setShowMissingOnly(true);
    }

    if (match) {
      const ep = parseInt(match[1], 10);
      const idx = missingEpisodes.indexOf(ep);
      if (idx >= 0) {
        setPage(Math.floor(idx / EPISODES_PER_PAGE) + 1);
      }
    }
  }, [searchParams, missingEpisodes]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageEpisodes: EpisodeRow[] = useMemo(() => {
    const start = (safePage - 1) * EPISODES_PER_PAGE;
    return filteredEpisodes.slice(start, start + EPISODES_PER_PAGE).map((ep) => ({
      number: ep.number,
      title: ep.title,
      image: ep.image,
      tracks: tracksByEpisode.get(ep.number) ?? [],
    }));
  }, [filteredEpisodes, safePage, tracksByEpisode]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const match = hash.match(/^#ep-(\d+)$/);
    if (!match) return;

    const ep = parseInt(match[1], 10);
    if (!Number.isFinite(ep) || ep <= 0) return;

    const scrollToEp = () => {
      document.getElementById(`ep-${ep}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const id = window.setTimeout(scrollToEp, 200);
    return () => window.clearTimeout(id);
  }, [safePage, pageEpisodes]);

  const coveragePct =
    totalEpisodes > 0 ? Math.round((cachedEpisodes / totalEpisodes) * 100) : 0;
  const uniqueLanguages = useMemo(() => {
    const langs = new Set(subtitles.map((t) => t.label));
    return [...langs].sort((a, b) => a.localeCompare(b));
  }, [subtitles]);

  const handleFetchEpisode = async (episode: number) => {
    setFetchingEp(episode);
    try {
      const tracks = await fetchAnimeEpisodeSubtitles(anilistId, episode, "sub");
      await refetch();
      if (tracks.length === 0) {
        toast.error(t("anime.subtitles.fetchEmpty"));
      } else {
        toast.success(t("anime.subtitles.fetchSuccess", { count: tracks.length }));
      }
    } catch {
      toast.error(t("anime.subtitles.fetchError"));
    } finally {
      setFetchingEp(null);
    }
  };

  const handleFetchAll = async () => {
    setFetchingAll(true);
    try {
      await fetchAllAnimeSubtitles(anilistId);
      await refetch();
      toast.success(t("anime.subtitles.fetchAllSuccess"));
    } catch {
      toast.error(t("anime.subtitles.fetchAllError"));
    } finally {
      setFetchingAll(false);
    }
  };

  const handleDownloadEpisodes = async (episodes?: number[]) => {
    if (episodes && episodes.length === 0) return;
    setDownloadingZip(true);
    try {
      await downloadSubtitleEpisodesZip(anilistId, episodes);
      toast.success(t("anime.subtitles.downloadZipSuccess"));
    } catch {
      toast.error(t("anime.subtitles.downloadZipError"));
    } finally {
      setDownloadingZip(false);
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
    const downloadable = pageEpisodes.filter((g) => g.tracks.length > 0).map((g) => g.number);
    setSelectedEps((prev) => new Set([...prev, ...downloadable]));
  };

  const clearSelection = () => setSelectedEps(new Set());

  const busy = fetchingEp !== null || fetchingAll || downloadingZip;
  const selectedList = [...selectedEps].sort((a, b) => a - b);
  const pageDownloadableCount = pageEpisodes.filter((g) => g.tracks.length > 0).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero stats */}
      <div className="rounded-2xl border border-teal-500/15 bg-gradient-to-br from-teal-500/[0.08] via-white/[0.02] to-transparent p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0">
              <Captions className="w-5 h-5 text-teal-300/90" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t("anime.subtitles.heading")}
              </h3>
              <p className="text-xs text-white/45 mt-1 max-w-xl leading-relaxed">
                {t("anime.subtitles.description", { provider: SUBTITLE_SOURCE_PROVIDER })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {cachedEpisodes > 0 && (
              <button
                type="button"
                onClick={() => handleDownloadEpisodes()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-white/8 border border-white/12 text-white/75 hover:bg-white/12 transition-colors disabled:opacity-50"
              >
                {downloadingZip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {t("anime.subtitles.downloadAllCached")}
              </button>
            )}

            {totalEpisodes > 0 && missingCount > 0 && (
              <button
                type="button"
                onClick={() => setShowMissingOnly((v) => !v)}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50",
                  showMissingOnly
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
                    : "bg-white/8 border-white/12 text-white/75 hover:bg-white/12",
                )}
              >
                {showMissingOnly
                  ? t("anime.subtitles.showAllEpisodes")
                  : t("anime.subtitles.showMissingOnly", { count: missingCount })}
              </button>
            )}

            {totalEpisodes > 0 && missingCount > 0 && (
              <button
                type="button"
                onClick={handleFetchAll}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold bg-teal-500/20 border border-teal-500/30 text-teal-200 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
              >
                {fetchingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {fetchingAll
                  ? t("anime.subtitles.fetchAllProgress")
                  : t("anime.subtitles.fetchAll")}
              </button>
            )}
          </div>
        </div>

        {totalEpisodes > 0 && (
          <div className="mt-4 pt-4 border-t border-white/8 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    {t("anime.subtitles.cachedCount", {
                      cached: cachedEpisodes,
                      total: totalEpisodes,
                    })}
                  </span>
                  <span className="text-[11px] font-mono text-teal-300/70">{coveragePct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500"
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
              </div>

              <div className="relative w-full lg:w-56">
                <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-white/30 pointer-events-none" />
                <input
                  value={query}
                  placeholder={t("anime.subtitles.searchPlaceholder")}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full pl-8 pr-3 text-xs rounded-lg bg-black/30 border border-white/10 text-white/75 placeholder:text-white/25 outline-none focus:border-teal-500/30 focus:bg-black/40 transition-all"
                />
              </div>
            </div>

            {(subtitles.length > 0 || uniqueLanguages.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {subtitles.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono bg-white/[0.05] border border-white/10 text-white/40">
                    {t("anime.subtitles.trackCount", { count: subtitles.length })}
                  </span>
                )}
                {uniqueLanguages.slice(0, 8).map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300/80"
                  >
                    {lang}
                  </span>
                ))}
                {uniqueLanguages.length > 8 && (
                  <span className="text-[10px] font-mono text-white/25 self-center">
                    +{uniqueLanguages.length - 8}
                  </span>
                )}
              </div>
            )}

            {missingEpisodes.length > 0 && !showMissingOnly && (
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-amber-200/60">
                    {t("anime.subtitles.missingEpisodesLabel")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMissingOnly(true)}
                    className="text-[10px] font-semibold text-amber-200/80 hover:text-amber-100"
                  >
                    {t("anime.subtitles.showMissingOnly", { count: missingCount })}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-auto">
                  {missingEpisodes.map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => {
                        setShowMissingOnly(true);
                        const idx = missingEpisodes.indexOf(ep);
                        if (idx >= 0) {
                          setPage(Math.floor(idx / EPISODES_PER_PAGE) + 1);
                        }
                      }}
                      className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-md text-[11px] font-mono font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20 transition-colors"
                    >
                      {ep}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {totalEpisodes === 0 && (
          <div className="mt-4 relative max-w-md">
            <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              value={query}
              placeholder={t("anime.subtitles.searchPlaceholder")}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full pl-8 pr-3 text-xs rounded-lg bg-black/30 border border-white/10 text-white/75 placeholder:text-white/25 outline-none focus:border-teal-500/30 focus:bg-black/40 transition-all"
            />
          </div>
        )}
      </div>

      {(episodesLoading || subtitlesLoading) && allEpisodes.length === 0 ? (
        <EpisodeThumbnailSkeletons />
      ) : pageEpisodes.length > 0 ? (
        <>
          {pageDownloadableCount > 0 && (
            <BatchDownloadBar
              selectedCount={selectedEps.size}
              pageDownloadableCount={pageDownloadableCount}
              downloading={downloadingZip}
              onSelectPage={selectAllOnPage}
              onClear={clearSelection}
              onDownloadSelected={() => handleDownloadEpisodes(selectedList)}
            />
          )}

          <div className="flex flex-col gap-3">
            {pageEpisodes.map((group) => (
              <EpisodeSubtitleCard
                key={group.number}
                group={group}
                busy={busy}
                fetchingEp={fetchingEp}
                fetchingAll={fetchingAll}
                selected={selectedEps.has(group.number)}
                canSelect={group.tracks.length > 0}
                onToggleSelect={() => toggleEpisodeSelection(group.number)}
                onFetch={() => handleFetchEpisode(group.number)}
                onDownloadEpisode={() => handleDownloadEpisodes([group.number])}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <EmptySubtitles
          totalEpisodes={totalEpisodes}
          fetchingEp={fetchingEp}
          onFetchEpisode={handleFetchEpisode}
        />
      )}
    </div>
  );
}

function BatchDownloadBar({
  selectedCount,
  pageDownloadableCount,
  downloading,
  onSelectPage,
  onClear,
  onDownloadSelected,
}: {
  selectedCount: number;
  pageDownloadableCount: number;
  downloading: boolean;
  onSelectPage: () => void;
  onClear: () => void;
  onDownloadSelected: () => void;
}) {
  const t = useT();

  return (
    <div className="sticky top-16 z-20 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-teal-500/15 bg-[#0a0a0a]/95 backdrop-blur-md px-4 py-2.5 shadow-lg shadow-black/30">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onSelectPage}
          disabled={downloading || pageDownloadableCount === 0}
          className="text-[11px] font-medium text-white/45 hover:text-white/70 transition-colors disabled:opacity-40"
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
              className="text-[11px] font-medium text-white/45 hover:text-white/70 transition-colors disabled:opacity-40"
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {t("anime.subtitles.downloadSelected", { count: selectedCount })}
        </button>
      )}
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
          <span className="text-2xl font-black font-mono text-white/10 select-none">
            {String(episode).padStart(2, "0")}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
    </div>
  );
}

function EpisodeSubtitleCard({
  group,
  busy,
  fetchingEp,
  fetchingAll,
  selected,
  canSelect,
  onToggleSelect,
  onFetch,
  onDownloadEpisode,
}: {
  group: EpisodeRow;
  busy: boolean;
  fetchingEp: number | null;
  fetchingAll: boolean;
  selected: boolean;
  canSelect: boolean;
  onToggleSelect: () => void;
  onFetch: () => void;
  onDownloadEpisode: () => void;
}) {
  const t = useT();
  const isFetching =
    fetchingEp === group.number || (fetchingAll && group.tracks.length === 0);

  return (
    <div
      id={`ep-${group.number}`}
      className={cn(
        "rounded-xl border bg-white/[0.02] overflow-hidden transition-all hover:border-white/12 scroll-mt-24",
        selected ? "border-teal-500/35 ring-1 ring-teal-500/15" : "border-white/8",
        group.tracks.length === 0 && "border-amber-500/15",
      )}
    >
      <div className="flex flex-col sm:flex-row gap-0">
        <div className="relative w-full sm:w-44 shrink-0 aspect-[16/9] sm:border-r border-white/6 overflow-hidden">
          {canSelect && (
            <button
              type="button"
              onClick={onToggleSelect}
              disabled={busy}
              className={cn(
                "absolute top-2 left-2 z-20 w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                selected
                  ? "bg-teal-500 border-teal-400 text-white"
                  : "bg-black/55 border-white/25 text-transparent hover:border-white/45",
              )}
              aria-label={`Select episode ${group.number}`}
            >
              {selected && <span className="text-[10px] font-bold leading-none">✓</span>}
            </button>
          )}
          <EpisodeThumbnail image={group.image} episode={group.number} />
          {isFetching && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-5 h-5 text-teal-300 animate-spin" />
            </div>
          )}
          <span className="absolute bottom-1.5 left-1.5 z-[1] text-[9px] font-mono font-bold text-white/90 bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded">
            EP {group.number}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/6 bg-white/[0.02] flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/85 truncate">
                {t("anime.subtitles.episodeLabel", { n: group.number })}
                {group.title !== `Episode ${group.number}` && (
                  <span className="text-white/40 font-normal"> — {group.title}</span>
                )}
              </p>
              <p className="text-[10px] font-mono text-white/25 mt-0.5">
                {isFetching
                  ? t("anime.subtitles.fetchAllProgress")
                  : group.tracks.length > 0
                    ? t("anime.subtitles.trackCount", { count: group.tracks.length })
                    : t("anime.subtitles.noTracks")}
              </p>
              {group.tracks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {group.tracks.map((track) => (
                    <span
                      key={track.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 border border-teal-500/15 text-teal-300/75"
                    >
                      <Captions className="w-2.5 h-2.5" />
                      {track.label}
                      {track.isDefault && (
                        <span className="text-[8px] uppercase opacity-70">· def</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
              {group.tracks.length > 0 && (
                <button
                  type="button"
                  onClick={onDownloadEpisode}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-teal-500/20 text-teal-300/90 hover:bg-teal-500/10 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {t("anime.subtitles.downloadEpisode")}
                </button>
              )}
              <button
                type="button"
                onClick={onFetch}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/45 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {fetchingEp === group.number ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {group.tracks.length > 0
                  ? t("anime.subtitles.refresh")
                  : t("anime.subtitles.fetchEpisode", { n: group.number })}
              </button>
            </div>
          </div>

          {group.tracks.length > 0 ? (
            <div className="divide-y divide-white/5">
              {group.tracks.map((track) => (
                <SubtitleTrackRow key={track.id} track={track} />
              ))}
            </div>
          ) : !isFetching ? (
            <div className="flex-1 flex items-center justify-center px-4 py-5">
              <p className="text-xs text-white/35">{t("anime.subtitles.noTracks")}</p>
            </div>
          ) : null}
        </div>
      </div>
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
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/50 hover:text-white/75 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/50 hover:text-white/75 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        {t("anime.subtitles.nextPage")}
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function SubtitleTrackRow({ track }: { track: AnimeSubtitleItem }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleExpand = async () => {
    const next = !expanded;
    setExpanded(next);

    if (next && content === null) {
      setLoading(true);
      try {
        const res = await api.get(track.previewUrl, { responseType: "text" });
        setContent(typeof res.data === "string" ? res.data : String(res.data));
      } catch {
        toast.error(t("anime.subtitles.previewError"));
        setExpanded(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const cues = content ? parseVttCues(content, 16) : [];
  const totalCues = content ? (content.match(/-->/g) ?? []).length : null;

  return (
    <div className="hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-3 min-w-0 flex-1 text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 group-hover:bg-teal-500/15 transition-colors">
            <Captions className="w-3.5 h-3.5 text-teal-400/80" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/80 font-medium truncate flex items-center gap-2">
              {track.label}
              {track.isDefault && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-px rounded bg-teal-500/15 text-teal-300/80 shrink-0">
                  {t("anime.subtitles.defaultTrack")}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-white/30 shrink-0 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </p>
            <p className="text-[10px] font-mono text-white/25 mt-0.5 truncate">
              {track.filename}
              {track.fetchedAt &&
                ` · ${new Date(track.fetchedAt).toLocaleDateString()}`}
              {totalCues !== null && !expanded &&
                ` · ${t("anime.subtitles.cueCount", { count: totalCues })}`}
            </p>
          </div>
        </button>

        <a
          href={track.downloadUrl}
          download={track.filename}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold",
            "bg-teal-500/10 border border-teal-500/20 text-teal-200/90",
            "hover:bg-teal-500/20 hover:text-teal-100 transition-colors shrink-0",
          )}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("anime.subtitles.download")}</span>
        </a>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-white/8 bg-black/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/6 bg-white/[0.02]">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                {t("anime.subtitles.preview")}
              </span>
              {totalCues !== null && (
                <span className="text-[10px] font-mono text-white/25">
                  {t("anime.subtitles.cueCount", { count: totalCues })}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-teal-400/40 animate-spin" />
              </div>
            ) : cues.length > 0 ? (
              <div className="max-h-72 overflow-auto divide-y divide-white/[0.04]">
                {cues.map((cue, i) => (
                  <div key={i} className="px-3 py-2.5 hover:bg-white/[0.02]">
                    <p className="text-[10px] font-mono text-teal-400/50 mb-1">
                      {formatCueTime(cue.start)} → {formatCueTime(cue.end)}
                    </p>
                    <p className="text-[13px] text-white/75 leading-snug">{cue.text}</p>
                  </div>
                ))}
                {totalCues !== null && totalCues > cues.length && (
                  <p className="px-3 py-2 text-[10px] font-mono text-white/25 text-center">
                    … {totalCues - cues.length} more
                  </p>
                )}
              </div>
            ) : (
              <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-relaxed font-mono text-white/55 whitespace-pre-wrap break-words">
                {content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptySubtitles({
  totalEpisodes,
  fetchingEp,
  onFetchEpisode,
}: {
  totalEpisodes: number;
  fetchingEp: number | null;
  onFetchEpisode: (episode: number) => void;
}) {
  const t = useT();

  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
        <Captions className="w-7 h-7 text-teal-400/50" />
      </div>
      <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
        {t("anime.subtitles.empty")}
      </p>
      {totalEpisodes > 0 && (
        <button
          type="button"
          onClick={() => onFetchEpisode(1)}
          disabled={fetchingEp !== null}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-teal-500/20 border border-teal-500/30 text-teal-200 hover:bg-teal-500/30 transition-colors disabled:opacity-50"
        >
          {fetchingEp === 1 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {t("anime.subtitles.fetchEpisode", { n: 1 })}
        </button>
      )}
    </div>
  );
}

function EpisodeThumbnailSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: EPISODES_PER_PAGE }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden animate-pulse flex"
        >
          <div className="w-40 sm:w-44 shrink-0 aspect-[16/9] bg-white/6" />
          <div className="flex-1 p-4 flex flex-col gap-2">
            <div className="h-4 w-40 rounded bg-white/6" />
            <div className="h-3 w-24 rounded bg-white/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
