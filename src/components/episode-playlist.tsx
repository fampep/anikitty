"use client";

import EpisodeCard from "./common/episode-card";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAnimeStore } from "@/store/anime-store";
import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { Episode, IEpisodes } from "@/types/episodes";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import { LayoutList, Grid2x2, LayoutGrid, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  animeId: string;
  title?: string;
  subOrDub?: { sub: number; dub: number };
  episodes: IEpisodes;
  isLoading: boolean;
};

const LAYOUT_OPTIONS: { value: EpisodeLayout; icon: React.ReactNode; label: string }[] = [
  { value: "list",      icon: <LayoutList  className="w-3.5 h-3.5" />, label: "List" },
  { value: "compact",   icon: <Grid2x2     className="w-3.5 h-3.5" />, label: "Compact" },
  { value: "thumbnail", icon: <LayoutGrid  className="w-3.5 h-3.5" />, label: "Thumbnails" },
];

const EpisodePlaylist = ({ animeId, subOrDub, episodes, isLoading }: Props) => {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode");
  const isLatestEpisode = searchParams.get("type");

  const { setSelectedEpisode, anime } = useAnimeStore();
  const { episodeLayout, setEpisodeLayout } = useSettingsStore();

  // Live episode-level progress from the DB (replaces the always-empty bookmark expand)
  const watchedEpisodes = useEpisodeProgress(animeId);

  const animePoster = anime?.anime?.info?.poster ?? "";

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const episodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total = episodes?.totalEpisodes ?? 0;
  const [currentGroup, setCurrentGroup] = useState(`1-${Math.min(50, total)}`);
  const [search, setSearch] = useState("");

  const groupRanges = (): Array<{ label: string; value: string }> => {
    const opts: Array<{ label: string; value: string }> = [];
    let s = 1;
    while (s <= total) {
      const e = Math.min(s + 49, total);
      opts.push({ label: `${s}–${e}`, value: `${s}-${e}` });
      s += 50;
    }
    return opts;
  };

  const [start, end] = currentGroup.split("-").map(Number);

  const baseFiltered = episodes.episodes.filter((_, i) => i >= start - 1 && i <= end - 1);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>(baseFiltered);

  useEffect(() => {
    if ((!episodeId || !episodeId.includes("ep")) && !!episodes?.episodes.length) {
      if (isLatestEpisode) {
        setSelectedEpisode(episodes.episodes[episodes.episodes.length - 1].episodeId as string);
      } else {
        setSelectedEpisode(episodes.episodes[0].episodeId as string);
      }
    }
    // eslint-disable-next-line
  }, [episodes]);

  useEffect(() => {
    if (!episodes || !currentGroup) return;
    const [s, e] = currentGroup.split("-").map(Number);
    setFilteredEpisodes(episodes.episodes.filter((_, i) => i >= s - 1 && i <= e - 1));
  }, [episodes, currentGroup]);

  useEffect(() => {
    const idx = episodes?.episodes.findIndex((ep) => ep.episodeId === episodeId);
    if (idx !== undefined && idx >= 0 && episodeRefs.current[idx]) {
      const el = episodeRefs.current[idx];
      const container = scrollContainerRef.current;
      if (el && container) {
        container.scrollTop = el.offsetTop - container.offsetHeight / 2 + el.offsetHeight / 2 + 80;
      }
    }
    // eslint-disable-next-line
  }, [animeId, episodes]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (!val) {
      const [s, en] = currentGroup.split("-").map(Number);
      setFilteredEpisodes(episodes.episodes.filter((_, i) => i >= s - 1 && i <= en - 1));
      return;
    }
    const v = val.toLowerCase();
    setFilteredEpisodes(
      episodes.episodes.filter(
        (ep) => ep.number.toString().includes(v) || ep.title?.toLowerCase().includes(v),
      ),
    );
  };

  const handleGroupChange = (val: string) => {
    setCurrentGroup(val);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  if (!episodes) return null;

  const ranges = groupRanges();
  const hasMultipleGroups = ranges.length > 1;

  return (
    <div className="col-span-1 flex flex-col w-full rounded-xl border border-white/10 bg-[#080808] overflow-hidden min-h-[200px] max-h-[720px]">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3.5 pb-3 border-b border-white/8 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold text-white leading-none">Episodes</h3>
            <p className="text-[11px] text-white/30 mt-1 font-mono leading-none">
              {total} {total === 1 ? "episode" : "episodes"}
            </p>
          </div>

          {/* Layout toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/8 shrink-0">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEpisodeLayout(opt.value)}
                title={opt.label}
                className={cn(
                  "p-1.5 rounded-md transition-all duration-150",
                  episodeLayout === opt.value
                    ? "bg-white/15 text-white"
                    : "text-white/25 hover:text-white/55",
                )}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25 pointer-events-none" />
          <input
            placeholder="Search by title or number…"
            value={search}
            onChange={handleSearch}
            className="w-full h-8 pl-7 pr-3 rounded-md bg-white/5 border border-white/10 text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {/* Group selector */}
        {hasMultipleGroups && !search && (
          <div className="flex gap-1 flex-wrap">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => handleGroupChange(r.value)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-colors",
                  currentGroup === r.value
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-transparent border-white/10 text-white/35 hover:border-white/20 hover:text-white/55",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Episode list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-1.5">
        {isLoading ? (
          <PlaylistSkeleton />
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/25 text-xs font-mono">
            no episodes found
          </div>
        ) : episodeLayout === "compact" ? (
          <div className="grid grid-cols-5 gap-1 px-2 pb-2">
            {filteredEpisodes.map((episode, idx) => (
              <div key={idx} ref={(el) => { episodeRefs.current[idx] = el; }}>
                <EpisodeCard
                  subOrDub={subOrDub}
                  variant="card"
                  showCard={false}
                  episode={episode}
                  animeId={animeId}
                  watchedEpisodes={watchedEpisodes}
                />
              </div>
            ))}
          </div>
        ) : episodeLayout === "thumbnail" ? (
          <div className="grid grid-cols-2 gap-2 px-2 pb-2 pt-1">
            {filteredEpisodes.map((episode, idx) => (
              <div key={idx} ref={(el) => { episodeRefs.current[idx] = el; }}>
                <EpisodeCard
                  subOrDub={subOrDub}
                  variant="thumbnail"
                  episode={episode}
                  animeId={animeId}
                  watchedEpisodes={watchedEpisodes}
                  animePoster={animePoster}
                />
              </div>
            ))}
          </div>
        ) : (
          filteredEpisodes.map((episode, idx) => (
            <div key={idx} ref={(el) => { episodeRefs.current[idx] = el; }}>
              <EpisodeCard
                subOrDub={subOrDub}
                variant="list"
                episode={episode}
                animeId={animeId}
                watchedEpisodes={watchedEpisodes}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PlaylistSkeleton = () => (
  <div className="space-y-0.5 px-1">
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="h-10 rounded-lg animate-pulse bg-white/5" />
    ))}
  </div>
);

export default EpisodePlaylist;
