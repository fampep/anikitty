"use client";

import EpisodeCard from "@/components/common/episode-card";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { Episode, IEpisodes } from "@/types/episodes";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Eye,
  EyeOff,
  Grid2x2,
  LayoutGrid,
  LayoutList,
  LocateFixed,
  Search,
  SkipForward,
} from "lucide-react";
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
import { ROUTES } from "@/constants/routes";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const isWatch = variant === "watch";
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode");

  const episodeLayout = useSettingsStore((s) => s.episodeLayout);
  const setEpisodeLayout = useSettingsStore((s) => s.setEpisodeLayout);
  const hideFillers = useSettingsStore((s) => s.hideFillers);
  const setHideFillers = useSettingsStore((s) => s.setHideFillers);
  const episodeSort = useSettingsStore((s) => s.episodeSort);
  const setEpisodeSort = useSettingsStore((s) => s.setEpisodeSort);
  const watchedEpisodes = useEpisodeProgress(animeId);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const episodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total =
    episodes.episodes.length > 0
      ? episodes.episodes.length
      : episodes?.totalEpisodes ?? 0;
  const [currentGroup, setCurrentGroup] = useState(`1-${Math.min(50, total)}`);
  const [search, setSearch] = useState("");
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

  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);

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
    sort: "asc" | "desc",
  ) => {
    let list = [...episodes.episodes];

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

    if (sort === "desc") {
      list = list.reverse();
    }

    setFilteredEpisodes(list);
  };

  const hasFillers = useMemo(
    () => episodes.episodes.some((ep) => ep.isFiller),
    [episodes],
  );

  const latestWatched = useMemo(() => {
    if (!watchedEpisodes.length) return null;
    let best: { episodeId: string; number: number; current: number } | null = null;
    for (const w of watchedEpisodes) {
      const ep = episodes.episodes.find((e) => e.episodeId === w.episodeId);
      if (!ep) continue;
      const score = ep.number * 1_000_000 + (w.current ?? 0);
      if (!best || score > best.number * 1_000_000 + best.current) {
        best = { episodeId: ep.episodeId, number: ep.number, current: w.current ?? 0 };
      }
    }
    return best;
  }, [watchedEpisodes, episodes.episodes]);

  useEffect(() => {
    if (!episodes) return;
    applyFilters(currentGroup, debouncedSearch, hideWatched, hideFillers, episodeSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, currentGroup, debouncedSearch, hideWatched, hideFillers, watchedEpisodes, episodeSort]);

  useEffect(() => {
    if (!episodeId || !episodes?.episodes.length) return;
    const idx = episodes.episodes.findIndex((ep) => ep.episodeId === episodeId);
    if (idx < 0) return;
    const el = episodeRefs.current[idx];
    const container = scrollContainerRef.current;
    if (!el || !container) return;

    requestAnimationFrame(() => {
      const elRect = el.getBoundingClientRect();
      const boxRect = container.getBoundingClientRect();
      const fullyVisible =
        elRect.top >= boxRect.top + 4 && elRect.bottom <= boxRect.bottom - 4;
      if (fullyVisible) return;
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
  }, [animeId, episodes, episodeId, filteredEpisodes.length, episodeLayout, isWatch]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleGroupChange = (val: string) => {
    setCurrentGroup(val);
    setSearch("");
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  const jumpToLatestWatched = () => {
    if (!latestWatched) return;
    const idx = episodes.episodes.findIndex((ep) => ep.episodeId === latestWatched.episodeId);
    if (idx >= 0) setCurrentGroup(groupForEpisodeNumber(idx + 1, total));
    const params = new URLSearchParams(searchParams.toString());
    params.set("anime", animeId);
    params.set("episode", latestWatched.episodeId);
    router.push(`${ROUTES.WATCH}?${params.toString()}`, { scroll: false });
  };

  if (!episodes) return null;

  const ranges = groupRanges;
  const hasMultipleGroups = ranges.length > 1;
  const layout = episodeLayout;
  const gridCols = isWatch ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8" : "grid-cols-5";

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

  const filterToolbar = (
    <>
      <button
        type="button"
        onClick={() => setHideWatched((v) => !v)}
        aria-label={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
        title={hideWatched ? t("watch.playlist.showAll") : t("watch.playlist.hideWatched")}
        className={cn(
          "touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
          hideWatched
            ? "border-primary/35 bg-primary/15 text-zinc-200"
            : "border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:hover:text-white/65",
        )}
      >
        {hideWatched ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>

      {hasFillers && (
        <button
          type="button"
          onClick={() => setHideFillers(!hideFillers)}
          aria-label={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
          title={hideFillers ? t("watch.playlist.showFillers") : t("watch.playlist.skipFillers")}
          className={cn(
            "touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
            hideFillers
              ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
              : "border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:hover:text-white/65",
          )}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => setEpisodeSort(episodeSort === "asc" ? "desc" : "asc")}
        aria-label={t("watch.playlist.sort")}
        title={
          episodeSort === "asc"
            ? t("watch.playlist.sortDesc")
            : t("watch.playlist.sortAsc")
        }
        className="touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:hover:text-white/65 transition-colors"
      >
        {episodeSort === "asc" ? (
          <ArrowUpAZ className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownAZ className="w-3.5 h-3.5" />
        )}
      </button>

      {latestWatched && latestWatched.episodeId !== episodeId && (
        <button
          type="button"
          onClick={jumpToLatestWatched}
          aria-label={t("watch.playlist.jumpLatest")}
          title={t("watch.playlist.jumpLatestEp", { n: latestWatched.number })}
          className="touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-teal-500/30 bg-teal-500/10 text-teal-200/90 hover:bg-teal-500/15 transition-colors"
        >
          <LocateFixed className="w-3.5 h-3.5" />
        </button>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "col-span-1 flex flex-col w-full overflow-hidden",
        isWatch
          ? "watch-episode-playlist site-panel min-h-0"
          : "min-h-0 flex-1 border-0 bg-transparent rounded-none shadow-none",
      )}
    >
      <div
        className={cn(
          "watch-episode-playlist__toolbar shrink-0 border-b border-border dark:border-white/[0.07]",
          isWatch ? "px-3 py-2.5 space-y-2" : "px-3 pt-2.5 pb-2 space-y-1.5",
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

              <div className="flex items-center gap-1.5 [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-xl">
                {filterToolbar}
              </div>

              <div className="flex items-center gap-0.5 bg-muted/50 dark:bg-white/5 rounded-xl p-1 border border-border dark:border-white/8 shrink-0">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEpisodeLayout(opt.value)}
                    title={t(opt.labelKey)}
                    className={cn(
                      "touch-target p-2 rounded-lg transition-all duration-150",
                      layout === opt.value
                        ? "bg-muted dark:bg-white/15 text-foreground dark:text-white"
                        : "text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:hover:text-white/55",
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
            <div className="flex items-center gap-1.5">
              {hasMultipleGroups && (
                <Select
                  value={currentGroup}
                  onValueChange={handleGroupChange}
                  disabled={Boolean(search.trim())}
                >
                  <SelectTrigger
                    aria-label={t("anime.episodes.range")}
                    className="h-9 w-[5.8rem] shrink-0 rounded-lg bg-muted/50 px-2.5 text-[11px] font-bold tabular-nums text-muted-foreground hover:bg-muted/70 disabled:opacity-40 dark:bg-white/[0.045] dark:border-white/10 dark:text-white/75 dark:hover:bg-white/[0.07]"
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
                  className="w-full h-9 pl-7 pr-3 rounded-lg bg-muted/50 border border-border text-[12px] text-muted-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:border-primary/40 dark:bg-white/[0.045] dark:border-white/10 dark:text-white/70 dark:placeholder:text-white/20 dark:focus:border-white/25"
                />
              </div>

              <div className="flex items-center gap-1 [&_button]:h-9 [&_button]:w-9 [&_button]:rounded-lg">
                {filterToolbar}
              </div>

              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/35 p-0.5 dark:border-white/8 dark:bg-white/[0.035]">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEpisodeLayout(opt.value)}
                    title={t(opt.labelKey)}
                    className={cn(
                      "site-focus flex h-8 w-8 items-center justify-center rounded-md transition-all",
                      layout === opt.value
                        ? "bg-white/12 text-white"
                        : "text-muted-foreground/80 hover:bg-white/[0.055] hover:text-foreground dark:text-white/35 dark:hover:text-white/70",
                    )}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        // Focusable so the arrow keys / PageUp / Home drive this list rather
        // than the page behind it. Labelled because it is now a tab stop.
        tabIndex={0}
        role="region"
        aria-label={t("watch.episodesAria")}
        className={cn(
          // overscroll-contain: reaching either end must not hand the scroll to
          // the page, which otherwise jumps the whole watch layout.
          "flex-1 overflow-y-auto overscroll-contain scroll-momentum site-thin-scroll",
          isWatch ? "max-h-[min(48vh,26rem)] py-1.5" : "min-h-0 py-1",
        )}
      >
        {isLoading ? (
          <PlaylistSkeleton dense={!isWatch} />
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-center">
            <p className="text-[12px] font-medium text-muted-foreground/80 dark:text-white/40">
              {t("watch.playlist.noEpisodes")}
            </p>
            {(hideWatched || hideFillers || debouncedSearch.trim()) && (
              <p className="text-[10px] font-mono text-muted-foreground/60 dark:text-white/25">
                {t("watch.playlist.filterPlaceholder")}
              </p>
            )}
          </div>
        ) : layout === "thumbnail" ? (
          <div className={cn("grid gap-1 px-2 pb-2", gridCols)}>
            {filteredEpisodes.map((episode) => (
              <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
                <EpisodeCard
                  {...cardProps(episode)}
                  variant="card"
                  showCard={false}
                  activeStyle="play"
                />
              </div>
            ))}
          </div>
        ) : layout === "compact" ? (
          filteredEpisodes.map((episode) => (
            <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
              <EpisodeCard {...cardProps(episode)} variant="list" />
            </div>
          ))
        ) : (
          filteredEpisodes.map((episode) => (
            <div key={episode.episodeId} ref={assignEpisodeRef(episode)}>
              <EpisodeCard {...cardProps(episode)} variant="text" activeStyle="play" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PlaylistSkeleton = ({ dense = false }: { dense?: boolean }) => (
  <div className={cn("space-y-0.5", dense ? "px-1.5" : "px-1")}>
    {Array.from({ length: dense ? 8 : 6 }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "rounded-lg animate-pulse bg-muted/40 dark:bg-white/[0.04]",
          dense ? "h-[52px]" : "h-[58px]",
        )}
      />
    ))}
  </div>
);

export default EpisodePlaylist;
