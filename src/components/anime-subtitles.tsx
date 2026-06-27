"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  useGetAnimeSubtitles,
  type AnimeSubtitleItem,
} from "@/query/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { SUBTITLE_SOURCE_PROVIDER } from "@/lib/subtitle-track-utils";
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [fetchingEp, setFetchingEp] = useState<number | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);

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

  const filteredEpisodes = useMemo(() => {
    if (!query.trim()) return allEpisodes;

    const lower = query.toLowerCase();
    return allEpisodes.filter(
      (ep) =>
        ep.number.toString().includes(lower) ||
        ep.title.toLowerCase().includes(lower) ||
        (tracksByEpisode.get(ep.number) ?? []).some((tr) =>
          tr.label.toLowerCase().includes(lower),
        ),
    );
  }, [allEpisodes, query, tracksByEpisode]);

  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / EPISODES_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, anilistId]);

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

  const totalEpisodes = allEpisodes.length;
  const cachedEpisodes = tracksByEpisode.size;
  const missingCount = totalEpisodes - cachedEpisodes;

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

  const busy = fetchingEp !== null || fetchingAll;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            {t("anime.subtitles.heading")}
          </h3>
          <p className="text-xs text-white/40 mt-1.5 max-w-xl leading-relaxed">
            {t("anime.subtitles.description", { provider: SUBTITLE_SOURCE_PROVIDER })}
          </p>
          {totalEpisodes > 0 && (
            <p className="text-[11px] font-mono text-white/25 mt-2">
              {t("anime.subtitles.cachedCount", {
                cached: cachedEpisodes,
                total: totalEpisodes,
              })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalEpisodes > 0 && missingCount > 0 && (
            <button
              type="button"
              onClick={handleFetchAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
            >
              {fetchingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {fetchingAll
                ? t("anime.subtitles.fetchAllProgress")
                : t("anime.subtitles.fetchAll")}
            </button>
          )}

          <div className="relative">
            <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              value={query}
              placeholder={t("anime.subtitles.searchPlaceholder")}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg bg-white/4 border border-white/10 text-white/75 placeholder:text-white/25 outline-none focus:border-white/25 focus:bg-white/7 transition-all w-52"
            />
          </div>
        </div>
      </div>

      {(episodesLoading || subtitlesLoading) && allEpisodes.length === 0 ? (
        <EpisodeThumbnailSkeletons />
      ) : pageEpisodes.length > 0 ? (
        <>
          <div className="flex flex-col gap-3">
            {pageEpisodes.map((group) => (
              <EpisodeSubtitleCard
                key={group.number}
                group={group}
                busy={busy}
                fetchingEp={fetchingEp}
                fetchingAll={fetchingAll}
                onFetch={() => handleFetchEpisode(group.number)}
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
  onFetch,
}: {
  group: EpisodeRow;
  busy: boolean;
  fetchingEp: number | null;
  fetchingAll: boolean;
  onFetch: () => void;
}) {
  const t = useT();
  const isFetching =
    fetchingEp === group.number || (fetchingAll && group.tracks.length === 0);

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="flex gap-0">
        <div className="relative w-40 sm:w-44 shrink-0 aspect-[16/9] border-r border-white/6 overflow-hidden">
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
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/6 bg-white/[0.02]">
            <div className="min-w-0">
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
            </div>
            <button
              type="button"
              onClick={onFetch}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/45 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50 shrink-0"
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

  const cueCount = content ? (content.match(/-->/g) ?? []).length : null;

  return (
    <div className="hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggleExpand}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Captions className="w-3.5 h-3.5 text-teal-400/80" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/75 font-medium truncate flex items-center gap-2">
              {track.label}
              {track.isDefault && (
                <span className="text-[10px] font-mono text-teal-400/70 uppercase shrink-0">
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
            </p>
          </div>
        </button>

        <a
          href={track.downloadUrl}
          download={track.filename}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold",
            "bg-white/8 border border-white/12 text-white/80",
            "hover:bg-white/12 hover:text-white transition-colors shrink-0",
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {t("anime.subtitles.download")}
        </a>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-white/8 bg-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/6 bg-white/[0.02]">
              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                {t("anime.subtitles.preview")}
              </span>
              {cueCount !== null && (
                <span className="text-[10px] font-mono text-white/25">
                  {t("anime.subtitles.cueCount", { count: cueCount })}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-white/25 animate-spin" />
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
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-6 py-12 text-center">
      <Captions className="w-8 h-8 text-white/15 mx-auto mb-4" />
      <p className="text-sm text-white/45 max-w-md mx-auto leading-relaxed">
        {t("anime.subtitles.empty")}
      </p>
      {totalEpisodes > 0 && (
        <button
          type="button"
          onClick={() => onFetchEpisode(1)}
          disabled={fetchingEp !== null}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 transition-colors disabled:opacity-50"
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
