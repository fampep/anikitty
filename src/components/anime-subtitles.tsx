"use client";

import { useMemo, useState } from "react";
import { Captions, Download, Loader2, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import {
  fetchAnimeEpisodeSubtitles,
  useGetAnimeSubtitles,
  type AnimeSubtitleItem,
} from "@/query/get-anime-subtitles";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { SUBTITLE_SOURCE_PROVIDER } from "@/lib/subtitle-track-utils";

type Props = {
  anilistId: number;
};

type EpisodeGroup = {
  episode: number;
  title: string;
  tracks: AnimeSubtitleItem[];
};

export default function AnimeSubtitles({ anilistId }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [fetchingEp, setFetchingEp] = useState<number | null>(null);

  const { data: episodesData } = useGetAllEpisodes(String(anilistId));
  const { data: subtitles = [], isLoading, refetch } = useGetAnimeSubtitles(anilistId);

  const episodeTitles = useMemo(() => {
    const map = new Map<number, string>();
    for (const ep of episodesData?.episodes ?? []) {
      map.set(ep.number, ep.title);
    }
    return map;
  }, [episodesData]);

  const groups = useMemo(() => {
    const byEpisode = new Map<number, AnimeSubtitleItem[]>();
    for (const track of subtitles) {
      const list = byEpisode.get(track.episode) ?? [];
      list.push(track);
      byEpisode.set(track.episode, list);
    }

    const result: EpisodeGroup[] = Array.from(byEpisode.entries())
      .sort(([a], [b]) => a - b)
      .map(([episode, tracks]) => ({
        episode,
        title: episodeTitles.get(episode) ?? `Episode ${episode}`,
        tracks: tracks.sort((a, b) => a.label.localeCompare(b.label)),
      }));

    if (!query.trim()) return result;

    const lower = query.toLowerCase();
    return result.filter(
      (g) =>
        g.episode.toString().includes(lower) ||
        g.title.toLowerCase().includes(lower) ||
        g.tracks.some((tr) => tr.label.toLowerCase().includes(lower)),
    );
  }, [subtitles, episodeTitles, query]);

  const totalEpisodes = episodesData?.episodes.length ?? 0;
  const cachedEpisodes = new Set(subtitles.map((s) => s.episode)).size;

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

      {isLoading ? (
        <SubtitleSkeleton />
      ) : groups.length > 0 ? (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div
              key={group.episode}
              className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/6 bg-white/[0.02]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/85 truncate">
                    {t("anime.subtitles.episodeLabel", { n: group.episode })}
                    {group.title !== `Episode ${group.episode}` && (
                      <span className="text-white/40 font-normal"> — {group.title}</span>
                    )}
                  </p>
                  <p className="text-[10px] font-mono text-white/25 mt-0.5">
                    {t("anime.subtitles.trackCount", { count: group.tracks.length })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchEpisode(group.episode)}
                  disabled={fetchingEp === group.episode}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/45 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {fetchingEp === group.episode ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {t("anime.subtitles.refresh")}
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {group.tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <Captions className="w-3.5 h-3.5 text-teal-400/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/75 font-medium truncate">
                          {track.label}
                          {track.isDefault && (
                            <span className="ml-2 text-[10px] font-mono text-teal-400/70 uppercase">
                              {t("anime.subtitles.defaultTrack")}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-mono text-white/25 mt-0.5">
                          {track.audio.toUpperCase()}
                          {track.fetchedAt &&
                            ` · ${new Date(track.fetchedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <a
                      href={track.downloadUrl}
                      download
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
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptySubtitles
          totalEpisodes={totalEpisodes}
          fetchingEp={fetchingEp}
          onFetchEpisode={handleFetchEpisode}
        />
      )}

      {!isLoading && totalEpisodes > 0 && groups.length > 0 && (
        <FetchMoreEpisodes
          episodes={episodesData!.episodes}
          cachedEpisodes={new Set(subtitles.map((s) => s.episode))}
          fetchingEp={fetchingEp}
          onFetchEpisode={handleFetchEpisode}
        />
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

function FetchMoreEpisodes({
  episodes,
  cachedEpisodes,
  fetchingEp,
  onFetchEpisode,
}: {
  episodes: { number: number; title: string }[];
  cachedEpisodes: Set<number>;
  fetchingEp: number | null;
  onFetchEpisode: (episode: number) => void;
}) {
  const t = useT();
  const missing = episodes.filter((ep) => !cachedEpisodes.has(ep.number)).slice(0, 12);

  if (missing.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.015] px-4 py-4">
      <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
        {t("anime.subtitles.fetchMore")}
      </p>
      <div className="flex flex-wrap gap-2">
        {missing.map((ep) => (
          <button
            key={ep.number}
            type="button"
            onClick={() => onFetchEpisode(ep.number)}
            disabled={fetchingEp !== null}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/8 text-white/40 hover:text-white/65 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {fetchingEp === ep.number ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            EP {ep.number}
          </button>
        ))}
      </div>
    </div>
  );
}

function SubtitleSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/6 bg-white/[0.02] h-24 animate-pulse" />
      ))}
    </div>
  );
}
