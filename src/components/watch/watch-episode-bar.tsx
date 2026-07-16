"use client";

import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Play,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { Episode, IEpisodes } from "@/types/episodes";
import type { WatchHistory } from "@/hooks/use-get-bookmark";
import { EpisodeThumbPreview } from "@/components/watch/episode-nav-preview";
import WatchMarkEpisodeButton from "@/components/watch/watch-mark-episode-button";
import { useState } from "react";

type Props = {
  currentEpisode: Episode;
  episodes: IEpisodes;
  animePoster?: string | null;
  animeName?: string;
  prevEpisode: Episode | null;
  nextEpisode: Episode | null;
  playlistOpen: boolean;
  onTogglePlaylist: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpToEpisode?: (episodeNumber: number) => void;
  watchedEpisodes?: WatchHistory[];
  getLivePreview?: () => string | null;
  animeId?: string;
  episodeDuration?: number;
  /** Theatre hides the mobile playlist — show jump + hide playlist toggle. */
  theatreMode?: boolean;
};

function episodeTitle(ep: Episode, animeName: string | undefined, t: (key: string, vars?: Record<string, string | number>) => string) {
  const meaningful =
    ep.title && ep.title.toLowerCase() !== `episode ${ep.number}`;
  if (meaningful) return ep.title;
  if (animeName) return t("watch.episodeTitle", { name: animeName, n: ep.number });
  return t("watch.episode", { n: ep.number });
}

export default function WatchEpisodeBar({
  currentEpisode,
  episodes,
  animePoster,
  animeName,
  prevEpisode,
  nextEpisode,
  playlistOpen,
  onTogglePlaylist,
  onPrev,
  onNext,
  onJumpToEpisode,
  watchedEpisodes = [],
  getLivePreview,
  animeId,
  episodeDuration,
  theatreMode = false,
}: Props) {
  const t = useT();
  const [jumpValue, setJumpValue] = useState("");

  const history = watchedEpisodes.find((w) => w.episodeId === currentEpisode.episodeId);
  const progressPct =
    history && history.duration != null && history.duration > 0
      ? Math.min(100, (history.current / history.duration) * 100)
      : 0;
  const inProgress = progressPct > 2 && progressPct < 95;
  const completed = progressPct >= 95;

  const title = episodeTitle(currentEpisode, animeName, t);
  const thumb = currentEpisode.image || animePoster || null;
  const total = episodes.episodes.length || episodes.totalEpisodes || 0;

  return (
    <div className="rounded-xl border border-border dark:border-white/8 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-visible">
      <div className="flex items-stretch min-h-[3.25rem] sm:min-h-[4.5rem]">
        <button
          type="button"
          onClick={onPrev}
          disabled={!prevEpisode}
          title={prevEpisode ? t("watch.episodeShort", { n: prevEpisode.number }) : undefined}
          className={cn(
            "site-focus flex items-center justify-center w-10 sm:w-11 shrink-0 border-r border-border dark:border-white/8 transition-colors",
            prevEpisode
              ? "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white hover:bg-muted/50 dark:hover:bg-white/[0.04]"
              : "text-muted-foreground/30 dark:text-white/12 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 px-2.5 sm:px-3 py-2 sm:py-2.5">
          <EpisodeThumbPreview
            title={title}
            episodeNumber={currentEpisode.number}
            fallbackImage={thumb}
            resolvePreviewImage={getLivePreview}
          >
            <div className="relative w-14 sm:w-[4.5rem] aspect-video rounded-lg overflow-hidden bg-muted/50 dark:bg-white/[0.04] ring-1 ring-border dark:ring-white/10 cursor-default">
              {thumb ? (
                <Image
                  src={thumb}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="72px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 dark:bg-white/[0.04]">
                  <Play className="w-4 h-4 text-muted-foreground/80 dark:text-white/25 fill-white/25" />
                </div>
              )}
              <span className="absolute bottom-0.5 left-0.5 z-[1] px-1 py-px rounded text-[8px] font-mono font-bold bg-black/70 text-foreground dark:text-white/90">
                {currentEpisode.number}
              </span>
            </div>
          </EpisodeThumbPreview>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-white/35">
                {t("watch.episode", { n: currentEpisode.number })}
              </p>
              <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground/70 dark:text-white/20">·</span>
              <p className="hidden sm:block text-[10px] font-mono text-muted-foreground dark:text-white/30">
                {t("watch.episodeIndex", {
                  current: currentEpisode.number,
                  total,
                })}
              </p>
              {currentEpisode.isFiller && (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20">·</span>
                  <span className="px-1.5 py-px text-[9px] rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/70 uppercase tracking-wide">
                    {t("watch.filler")}
                  </span>
                </>
              )}
              {completed && (
                <>
                  <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20">·</span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-teal-400/70 uppercase">
                    <Check className="w-2.5 h-2.5" />
                    {t("watch.episodeWatched")}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm sm:text-[15px] font-semibold text-foreground dark:text-white leading-snug line-clamp-1 sm:line-clamp-2">
              {title}
            </p>

            {onJumpToEpisode && total > 1 && (
              <form
                className={cn(
                  "mt-2 items-center gap-1.5 max-w-[11rem]",
                  theatreMode ? "flex" : "hidden sm:flex",
                )}
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(jumpValue, 10);
                  if (Number.isFinite(n) && n >= 1 && n <= total) {
                    onJumpToEpisode(n);
                    setJumpValue("");
                  }
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={total}
                  inputMode="numeric"
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  placeholder={t("watch.episodeJumpPlaceholder")}
                  className="h-7 w-14 rounded-md border border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.04] px-2 text-[11px] font-mono text-foreground dark:text-white/80 focus:outline-none focus:border-violet-400/35"
                  aria-label={t("watch.episodeJumpLabel")}
                />
                <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30">
                  / {total}
                </span>
              </form>
            )}

            {animeId && (
              <div className="mt-2 hidden sm:block">
                <WatchMarkEpisodeButton
                  animeId={animeId}
                  episodeId={currentEpisode.episodeId}
                  duration={episodeDuration}
                />
              </div>
            )}

            {inProgress && (
              <div className="mt-2 h-1 rounded-full bg-accent dark:bg-white/[0.06] overflow-hidden max-w-xs">
                <div
                  className="h-full rounded-full bg-teal-500/70 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            {nextEpisode && (
              <button
                type="button"
                onClick={onNext}
                className="mt-1.5 hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/50 transition-colors truncate max-w-full"
              >
                <span className="shrink-0">{t("watch.nextEpisode")}:</span>
                <span className="truncate text-muted-foreground dark:text-white/40">
                  {episodeTitle(nextEpisode, animeName, t)}
                </span>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
              </button>
            )}
          </div>
        </div>

        {!theatreMode && (
          <button
            type="button"
            onClick={onTogglePlaylist}
            className="lg:hidden site-focus flex flex-col items-center justify-center gap-0.5 px-2.5 border-l border-border dark:border-white/8 text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 hover:bg-muted/40 dark:hover:bg-white/[0.03] transition-colors shrink-0"
          >
            <span className="text-[9px] font-mono uppercase tracking-wide leading-none">
              {t("anime.episodes.title")}
            </span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", playlistOpen && "rotate-180")}
            />
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={!nextEpisode}
          title={nextEpisode ? t("watch.episodeShort", { n: nextEpisode.number }) : undefined}
          className={cn(
            "site-focus flex items-center justify-center w-10 sm:w-11 shrink-0 border-l border-border dark:border-white/8 transition-colors",
            nextEpisode
              ? "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white hover:bg-muted/50 dark:hover:bg-white/[0.04]"
              : "text-muted-foreground/30 dark:text-white/12 cursor-not-allowed",
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
