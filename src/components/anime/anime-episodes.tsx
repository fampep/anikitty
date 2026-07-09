"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/core/utils";
import { Eye, EyeOff, Search } from "lucide-react";
import EpisodeCard from "@/components/common/episode-card";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import { Episode } from "@/types/episodes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";

type Props = {
  animeId: string;
  subOrDub?: { sub: number; dub: number };
};

function filterEpisodes(
  source: Episode[],
  opts: {
    query: string;
    range: string;
    hideWatched: boolean;
    hideFillers: boolean;
    watchedIds: Set<string>;
  },
): Episode[] {
  let list = source;

  if (opts.query.trim()) {
    const lower = opts.query.toLowerCase();
    list = list.filter(
      (ep) =>
        ep.number.toString().includes(lower) ||
        ep.title.toLowerCase().includes(lower),
    );
  } else if (opts.range) {
    const [start, end] = opts.range.split("-").map(Number);
    list = list.slice(start - 1, end);
  }

  if (opts.hideWatched) {
    list = list.filter((ep) => !opts.watchedIds.has(ep.episodeId));
  }

  if (opts.hideFillers) {
    list = list.filter((ep) => !ep.isFiller);
  }

  return list;
}

const AnimeEpisodes = ({ animeId, subOrDub }: Props) => {
  const t = useT();
  const episodeLayout = useSettingsStore((s) => s.episodeLayout);
  const watchedEpisodes = useEpisodeProgress(animeId);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [ranges, setRanges] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>("");
  const [query, setQuery] = useState("");
  const [hideWatched, setHideWatched] = useState(false);
  const [hideFillers, setHideFillers] = useState(false);

  const { data, isLoading } = useGetAllEpisodes(animeId);

  useEffect(() => {
    if (!data) return;
    const eps = data.episodes;
    setAllEpisodes(eps);

    if (eps.length > 50) {
      const rangesArray: string[] = [];
      for (let i = 0; i < eps.length; i += 50) {
        rangesArray.push(`${i + 1}-${Math.min(i + 50, eps.length)}`);
      }
      setRanges(rangesArray);
      setSelectedRange(rangesArray[0]);
    } else {
      setRanges([]);
      setSelectedRange("");
    }
  }, [data]);

  const watchedIds = useMemo(
    () => new Set(watchedEpisodes.map((w) => w.episodeId)),
    [watchedEpisodes],
  );

  const hasFillers = useMemo(
    () => allEpisodes.some((ep) => ep.isFiller),
    [allEpisodes],
  );

  const episodes = useMemo(
    () =>
      filterEpisodes(allEpisodes, {
        query,
        range: query.trim() ? "" : selectedRange,
        hideWatched,
        hideFillers,
        watchedIds,
      }),
    [allEpisodes, query, selectedRange, hideWatched, hideFillers, watchedIds],
  );

  const emptyMessage = query.trim()
    ? t("anime.episodes.noSearchResults")
    : t("anime.episodes.noEpisodes");

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    setQuery("");
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest shrink-0">
          {allEpisodes.length > 0 ? t("anime.episodes.count", { count: allEpisodes.length }) : t("anime.episodes.title")}
        </h3>

        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Search className="absolute inset-y-0 left-3 m-auto h-4 w-4 text-muted-foreground dark:text-white/30 pointer-events-none" />
          <input
            value={query}
            placeholder={t("anime.episodes.searchPlaceholder")}
            onChange={handleSearch}
            className="h-11 w-full pl-10 pr-3 text-sm rounded-xl bg-muted/40 dark:bg-white/4 border border-border dark:border-white/10 text-foreground/85 dark:text-white/75 placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 outline-none focus:border-primary/40 dark:focus:border-white/25 focus:bg-white/7 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-momentum pb-0.5 sm:pb-0 sm:flex-wrap sm:overflow-visible">
          {watchedEpisodes.length > 0 && (
            <button
              type="button"
              onClick={() => setHideWatched((v) => !v)}
              aria-label={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
              title={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
              className={cn(
                "touch-target h-11 w-11 flex items-center justify-center rounded-xl border transition-colors",
                hideWatched
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                  : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/50 hover:bg-muted/60 dark:hover:bg-white/8",
              )}
            >
              {hideWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}

          {hasFillers && (
            <button
              type="button"
              onClick={() => setHideFillers((v) => !v)}
              aria-label={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
              title={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
              className={cn(
                "touch-target h-11 px-3 flex items-center justify-center rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wide transition-colors shrink-0",
                hideFillers
                  ? "border-amber-500/40 bg-amber-500/12 text-amber-200/90"
                  : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/4 text-muted-foreground dark:text-white/50 hover:bg-muted/60 dark:hover:bg-white/8",
              )}
            >
              FILLER
            </button>
          )}

          {ranges.length > 0 && !query.trim() && (
            <Select onValueChange={handleRangeChange} value={selectedRange}>
              <SelectTrigger className="h-11 text-xs w-[130px] shrink-0 bg-muted/40 dark:bg-white/4 border-border dark:border-white/10 text-muted-foreground dark:text-white/65 hover:bg-white/7 transition-colors">
                <SelectValue placeholder={t("anime.episodes.range")} />
              </SelectTrigger>
              <SelectContent className="bg-[#0e0e0e] border-border dark:border-white/10">
                <SelectGroup>
                  {ranges.map((range) => (
                    <SelectItem key={range} value={range} className="text-xs text-muted-foreground dark:text-white/70">
                      {range}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

        </div>
      </div>

      {/* Episode grid / list — layout follows Settings → Episode layout */}
      {episodeLayout === "compact" ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.episodeId}
              episode={episode}
              animeId={animeId}
              variant="card"
              showCard={false}
              watchedEpisodes={watchedEpisodes}
              subOrDub={subOrDub}
            />
          ))}
          {!episodes.length && !isLoading && <EmptyState colSpan="col-span-full" message={emptyMessage} />}
          {isLoading && <CompactSkeletons />}
        </div>
      ) : episodeLayout === "thumbnail" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.episodeId}
              episode={episode}
              animeId={animeId}
              variant="thumbnail"
              watchedEpisodes={watchedEpisodes}
              subOrDub={subOrDub}
            />
          ))}
          {!episodes.length && !isLoading && <EmptyState colSpan="col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5" message={emptyMessage} />}
          {isLoading && <ThumbnailSkeletons />}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.episodeId}
              episode={episode}
              animeId={animeId}
              variant="list"
              watchedEpisodes={watchedEpisodes}
              subOrDub={subOrDub}
            />
          ))}
          {!episodes.length && !isLoading && <EmptyState colSpan="" message={emptyMessage} />}
          {isLoading && <ListSkeletons />}
        </div>
      )}
    </div>
  );
};

function EmptyState({ colSpan, message }: { colSpan: string; message: string }) {
  return (
    <div
      className={cn(
        colSpan,
        "flex items-center justify-center py-16 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/6",
      )}
    >
      <p className="text-muted-foreground/80 dark:text-white/25 text-sm font-mono">{message}</p>
    </div>
  );
}

function ThumbnailSkeletons() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-muted/60 dark:bg-muted/60 dark:bg-white/6" />
          <div className="h-8 bg-muted/40 dark:bg-white/4 mt-0.5" />
        </div>
      ))}
    </>
  );
}

function ListSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-0 rounded-xl overflow-hidden animate-pulse h-[60px]">
          <div className="w-[108px] shrink-0 bg-muted/60 dark:bg-muted/60 dark:bg-white/6" />
          <div className="flex-1 bg-muted/40 dark:bg-white/4 ml-0.5" />
        </div>
      ))}
    </>
  );
}

function CompactSkeletons() {
  return (
    <>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-lg animate-pulse bg-muted/50 dark:bg-white/5" />
      ))}
    </>
  );
}

export default AnimeEpisodes;
