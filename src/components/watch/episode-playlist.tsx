"use client";

import EpisodeCard from "@/components/common/episode-card";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useAnimeStore } from "@/store/anime-store";
import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { Episode, IEpisodes } from "@/types/episodes";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import { Eye, EyeOff, Grid2x2, LayoutGrid, LayoutList, Search, SkipForward } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  animeId: string;
  title?: string;
  subOrDub?: { sub: number; dub: number };
  episodes: IEpisodes;
  isLoading: boolean;
  variant?: "sidebar" | "watch";
};

const LAYOUT_OPTIONS: { value: EpisodeLayout; icon: React.ReactNode; labelKey: string }[] = [
  { value: "list", icon: <LayoutList className="w-3.5 h-3.5" />, labelKey: "settings.layoutList" },
  { value: "compact", icon: <Grid2x2 className="w-3.5 h-3.5" />, labelKey: "settings.layoutCompact" },
  { value: "thumbnail", icon: <LayoutGrid className="w-3.5 h-3.5" />, labelKey: "settings.layoutThumbnail" },
];

function groupForEpisodeNumber(epNum: number, total: number): string {
  const start = Math.floor((epNum - 1) / 50) * 50 + 1;
  const end = Math.min(start + 49, total);
  return `${start}-${end}`;
}

const EpisodePlaylist = ({
  animeId,
  subOrDub,
  episodes,
  isLoading,
  variant = "sidebar",
}: Props) => {
  const t = useT();
  const isWatch = variant === "watch";
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode");

  const { anime } = useAnimeStore();
  const { episodeLayout, setEpisodeLayout, hideFillers, setHideFillers } = useSettingsStore();

  const watchedEpisodes = useEpisodeProgress(animeId);
  const animePoster = anime?.anime?.info?.poster ?? "";

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const episodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total =
    episodes.episodes.length > 0
      ? episodes.episodes.length
      : episodes?.totalEpisodes ?? 0;
  const [currentGroup, setCurrentGroup] = useState(`1-${Math.min(50, total)}`);
  const [search, setSearch] = useState("");
  // Debounced value drives filtering so typing doesn't refilter on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 180);
    return () => clearTimeout(id);
  }, [search]);
  const [hideWatched, setHideWatched] = useState(false);

  const groupRanges = useMemo((): Array<{ label: string; value: string }> => {
    const opts: Array<{ label: string; value: string }> = [];
    let s = 1;
    while (s <= total) {
      const e = Math.min(s + 49, total);
      opts.push({ label: `${s} – ${e}`, value: `${s}-${e}` });
      s += 50;
    }
    return opts;
  }, [total]);

  const [start, end] = currentGroup.split("-").map(Number);

  const baseFiltered = episodes.episodes.filter((_, i) => i >= start - 1 && i <= end - 1);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>(baseFiltered);

  useEffect(() => {
    if (!episodeId || !episodes?.episodes.length || total <= 0) return;
    const idx = episodes.episodes.findIndex((ep) => ep.episodeId === episodeId);
    if (idx < 0) return;
    setCurrentGroup(groupForEpisodeNumber(idx + 1, total));
  }, [episodeId, episodes, total]);

  const applyFilters = (
    group: string,
    query: string,
    watchedOnly: boolean,
    skipFillers: boolean,
  ) => {
    let list = episodes.episodes;

    if (query.trim()) {
      const v = query.toLowerCase();
      list = list.filter(
        (ep) => ep.number.toString().includes(v) || ep.title?.toLowerCase().includes(v),
      );
    } else {
      const [s, e] = group.split("-").map(Number);
      list = list.filter((_, i) => i >= s - 1 && i <= e - 1);
    }

    if (watchedOnly) {
      const watchedIds = new Set(watchedEpisodes.map((w) => w.episodeId));
      list = list.filter((ep) => !watchedIds.has(ep.episodeId));
    }

    if (skipFillers) {
      list = list.filter((ep) => !ep.isFiller);
    }

    setFilteredEpisodes(list);
  };

  /** Whether this title has any filler episodes at all (to show the toggle). */
  const hasFillers = useMemo(
    () => episodes.episodes.some((ep) => ep.isFiller),
    [episodes],
  );

  useEffect(() => {
    if (!episodes) return;
    applyFilters(currentGroup, debouncedSearch, hideWatched, hideFillers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, currentGroup, debouncedSearch, hideWatched, hideFillers, watchedEpisodes]);

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
  }, [animeId, episodes, episodeId, filteredEpisodes.length]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleGroupChange = (val: string) => {
    setCurrentGroup(val);
    setSearch("");
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  if (!episodes) return null;

  const ranges = groupRanges;
  const hasMultipleGroups = ranges.length > 1;
  const layout = isWatch && episodeLayout === "list" ? "compact" : episodeLayout;
  const gridCols = isWatch ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-5";

  const assignEpisodeRef = (episode: Episode) => (el: HTMLDivElement | null) => {
    const idx = episodes.episodes.findIndex((e) => e.episodeId === episode.episodeId);
    if (idx >= 0) episodeRefs.current[idx] = el;
  };

  const cardProps = (episode: Episode) => ({
    subOrDub,
    episode,
    animeId,
    watchedEpisodes,
  });

  return (
    <div
      className={cn(
        "col-span-1 flex flex-col w-full overflow-hidden",
        // Sidebar sits inside the watch aside shell — no second panel frame.
        isWatch
          ? "site-panel min-h-0"
          : "min-h-0 flex-1 border-0 bg-transparent rounded-none shadow-none",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-border dark:border-white/[0.07]",
          isWatch ? "px-3 py-3 space-y-2.5" : "px-3.5 pt-3 pb-2.5 space-y-2",
        )}
      >
        {isWatch ? (
          <div className="flex flex-col gap-2.5">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80 dark:text-white/25 pointer-events-none" />
              <input
                placeholder={t("watch.playlist.filterPlaceholder")}
                value={search}
                onChange={handleSearch}
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/10 text-[13px] text-muted-foreground dark:text-white/70 placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-momentum pb-0.5">
            {hasMultipleGroups && (
              <select
                value={currentGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                disabled={Boolean(search.trim())}
                className="h-11 min-w-[6.5rem] shrink-0 rounded-xl bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/10 px-2.5 text-[11px] font-mono text-muted-foreground dark:text-white/70 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 disabled:opacity-40"
              >
                {ranges.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#111]">
                    {r.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setHideWatched((v) => !v)}
              aria-label={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
              title={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
              className={cn(
                "touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                hideWatched
                  ? "border-primary/35 bg-primary/15 text-zinc-200"
                  : "border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65",
              )}
            >
              {hideWatched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {hasFillers && (
              <button
                type="button"
                onClick={() => setHideFillers(!hideFillers)}
                aria-label={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
                title={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
                className={cn(
                  "touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  hideFillers
                    ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                    : "border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/65",
                )}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-0.5 bg-muted/50 dark:bg-white/5 rounded-xl p-1 border border-border dark:border-white/8 shrink-0">
              {LAYOUT_OPTIONS.filter((o) => o.value !== "list").map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEpisodeLayout(opt.value)}
                  title={t(opt.labelKey)}
                  className={cn(
                    "touch-target p-2 rounded-lg transition-all duration-150",
                    layout === opt.value
                      ? "bg-muted dark:bg-white/15 text-foreground dark:text-white"
                      : "text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/55",
                  )}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-foreground dark:text-white leading-none">
                  {t("watch.playlist.title")}
                </h3>
                <p className="text-[11px] text-muted-foreground dark:text-white/30 mt-1 font-mono leading-none">
                  {total} {total === 1 ? t("watch.playlist.episode") : t("watch.playlist.episodes")}
                </p>
              </div>

              <div className="flex items-center gap-0.5 bg-muted/50 dark:bg-white/5 rounded-lg p-0.5 border border-border dark:border-white/8 shrink-0">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEpisodeLayout(opt.value)}
                    title={t(opt.labelKey)}
                    className={cn(
                      "p-1.5 rounded-md transition-all duration-150",
                      episodeLayout === opt.value
                        ? "bg-muted dark:bg-white/15 text-foreground dark:text-white"
                        : "text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/55",
                    )}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasMultipleGroups && (
                <Select
                  value={currentGroup}
                  onValueChange={handleGroupChange}
                  disabled={Boolean(search.trim())}
                >
                  <SelectTrigger
                    aria-label={t("anime.episodes.range")}
                    className="h-8 w-[7.25rem] shrink-0 rounded-md bg-muted/50 dark:bg-white/5 border-border dark:border-white/10 px-2.5 text-[11px] font-mono text-muted-foreground dark:text-white/70 hover:bg-muted/70 dark:hover:bg-white/[0.07] disabled:opacity-40"
                  >
                    <SelectValue placeholder={t("anime.episodes.range")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-border dark:border-white/10 max-h-[min(16rem,50vh)]">
                    <SelectGroup>
                      {ranges.map((r) => (
                        <SelectItem
                          key={r.value}
                          value={r.value}
                          className="text-[11px] font-mono text-muted-foreground dark:text-white/70"
                        >
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/80 dark:text-white/25 pointer-events-none" />
                <input
                  placeholder={t("watch.playlist.searchPlaceholder")}
                  value={search}
                  onChange={handleSearch}
                  className="w-full h-8 pl-7 pr-3 rounded-md bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-[12px] text-muted-foreground dark:text-white/70 placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-y-auto py-1.5 scroll-momentum scrollbar-hide",
          isWatch ? "max-h-[min(52vh,28rem)]" : "min-h-0",
        )}
      >
        {isLoading ? (
          <PlaylistSkeleton />
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground/80 dark:text-white/25 text-xs font-mono">
            {t("watch.playlist.noEpisodes")}
          </div>
        ) : layout === "compact" ? (
          <div className={cn("grid gap-1.5 px-2 pb-2", gridCols)}>
            {filteredEpisodes.map((episode) => (
              <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
                <EpisodeCard
                  {...cardProps(episode)}
                  variant="card"
                  showCard={false}
                  activeStyle={isWatch ? "play" : "default"}
                />
              </div>
            ))}
          </div>
        ) : layout === "thumbnail" ? (
          <div className="grid grid-cols-2 gap-2 px-2 pb-2 pt-1">
            {filteredEpisodes.map((episode) => (
              <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
                <EpisodeCard
                  {...cardProps(episode)}
                  variant="thumbnail"
                  animePoster={animePoster}
                />
              </div>
            ))}
          </div>
        ) : (
          filteredEpisodes.map((episode) => (
            <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
              <EpisodeCard {...cardProps(episode)} variant="list" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PlaylistSkeleton = () => (
  <div className="space-y-0.5 px-1">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="h-[61px] rounded-xl animate-pulse bg-muted/50 dark:bg-white/5" />
    ))}
  </div>
);

export default EpisodePlaylist;
