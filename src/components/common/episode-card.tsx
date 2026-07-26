"use client";

import React, { memo } from "react";
import Image from "next/image";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { Episode } from "@/types/episodes";
import { useAnimeStore } from "@/store/anime-store";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";
import { Check, Play } from "lucide-react";
import Link from "next/link";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { isEpisodePlayable } from "@/lib/anime/episode-availability";
import { useT } from "@/providers/i18n-provider";

type Props = {
  className?: string;
  episode: Episode;
  showCard?: boolean;
  animeId: string;
  variant?: "card" | "list" | "thumbnail";
  subOrDub?: { sub: number; dub: number };
  watchedEpisodes?: WatchHistory[] | null;
  animePoster?: string;
  activeStyle?: "default" | "play";
};

/** Cheap text chips — no Lucide SVGs per episode in long lists. */
function EpisodeAudioMarks({
  episodeNumber,
  subOrDub,
}: {
  episodeNumber: number;
  subOrDub?: { sub: number; dub: number };
}) {
  if (!subOrDub) return null;
  const hasSub = episodeNumber <= subOrDub.sub;
  const hasDub = episodeNumber <= subOrDub.dub;
  if (!hasSub && !hasDub) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {hasSub ? (
        <span className="rounded px-1 py-px text-[8px] font-bold leading-none bg-sky-600/85 text-sky-50">
          S
        </span>
      ) : null}
      {hasDub ? (
        <span className="rounded px-1 py-px text-[8px] font-bold leading-none bg-violet-600/85 text-violet-50">
          D
        </span>
      ) : null}
    </span>
  );
}

function EpisodeCardShell({
  playable,
  href,
  children,
  className,
  title,
}: {
  playable: boolean;
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  if (!playable) {
    return (
      <div className={cn("cursor-not-allowed", className)} title={title} aria-disabled="true">
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className={className} title={title}>
      {children}
    </Link>
  );
}

const EpisodeCard = memo(function EpisodeCard({
  showCard = false,
  variant = "card",
  ...props
}: Props) {
  const t = useT();
  const isActive = useAnimeStore((s) => s.selectedEpisode === props.episode.episodeId);
  const { hasWatchedEpisode } = useHasAnimeWatched(
    props.animeId,
    props.episode.episodeId,
    props.watchedEpisodes!,
  );

  const hasMeaningfulTitle =
    props.episode.title &&
    props.episode.title.toLowerCase() !== `episode ${props.episode.number}`;

  const href = `${ROUTES.WATCH}?anime=${props.animeId}&episode=${props.episode.episodeId}`;
  const playable = isEpisodePlayable(props.episode);
  const unreleasedTitle = playable ? undefined : t("watch.notAiredYet");

  // ── Compact number grid cell ──────────────────────────────────────
  if (!showCard && variant === "card") {
    const playActive = isActive && props.activeStyle === "play";

    return (
      <EpisodeCardShell playable={playable} href={href} title={unreleasedTitle}>
        <div
          title={props.episode.isFiller ? `Episode ${props.episode.number} · Filler` : undefined}
          className={cn(
            "relative aspect-square rounded-lg w-full flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
            playable ? "cursor-pointer" : "cursor-not-allowed opacity-45",
            playActive
              ? "bg-zinc-200 text-zinc-950 ring-1 ring-zinc-100/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              : isActive
                ? "bg-zinc-500/20 ring-1 ring-zinc-400/35 text-zinc-100"
                : "bg-accent dark:bg-white/[0.05] hover:bg-accent dark:hover:bg-white/[0.09] text-muted-foreground dark:text-white/55",
            playable && !playActive && !isActive && "hover:bg-accent dark:hover:bg-white/[0.09]",
            !playActive && !isActive && props.episode.isFiller && "ring-1 ring-amber-500/25",
            hasWatchedEpisode && !isActive && "opacity-45",
          )}
        >
          {playActive ? (
            <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950" />
          ) : (
            <>
              <span className="font-mono font-bold text-[11px] tabular-nums">{props.episode.number}</span>
              {hasWatchedEpisode && <Check className="w-2.5 h-2.5 opacity-50" />}
            </>
          )}
          {props.episode.isFiller && !playActive && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400/85" />
          )}
        </div>
      </EpisodeCardShell>
    );
  }

  // ── Thumbnail card ────────────────────────────────────────────────
  if (variant === "thumbnail") {
    const history = props.watchedEpisodes?.find(
      (w) => w.episodeId === props.episode.episodeId,
    );
    const current = history?.current ?? 0;
    const duration = history?.duration ?? 0;
    const progressPct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
    const isInProgress = current > 10 && progressPct < 95;
    const isCompleted = progressPct >= 95 || (hasWatchedEpisode && !isInProgress);

    const episodeImage = props.episode.image;

    return (
      <EpisodeCardShell playable={playable} href={href} title={unreleasedTitle}>
        <div
          className={cn(
            "group rounded-xl overflow-hidden transition-colors duration-150 border",
            playable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
            isActive
              ? "border-zinc-400/40 ring-1 ring-zinc-400/20 dark:border-zinc-300/35 dark:ring-zinc-300/15"
              : props.episode.isFiller
                ? "border-amber-500/30 ring-1 ring-amber-500/15 hover:border-amber-500/45"
                : "border-border dark:border-white/[0.07] hover:border-border dark:hover:border-white/18",
          )}
        >
          <div className="relative aspect-[16/9] bg-[#0d0d0d] overflow-hidden">
            {episodeImage ? (
              <Image
                src={episodeImage}
                alt={`Episode ${props.episode.number}`}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 640px) 50vw, 200px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-transparent">
                <span className="text-3xl font-black font-mono text-muted-foreground/20 dark:text-white/8 select-none">
                  {String(props.episode.number).padStart(2, "0")}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            {playable && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <div className="bg-white/90 rounded-full p-2 shadow-xl">
                  <Play className="w-3.5 h-3.5 text-black fill-black" />
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-foreground dark:text-white/85 bg-black/70 px-1.5 py-0.5 rounded">
                EP {props.episode.number}
              </span>
              {props.episode.isFiller && (
                <span className="text-[9px] font-mono text-amber-400/80 bg-black/70 px-1 py-0.5 rounded">
                  FILLER
                </span>
              )}
            </div>

            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              {isCompleted && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/80">
                  <Check className="w-2.5 h-2.5 text-foreground dark:text-white" />
                </span>
              )}
              {isInProgress && !isCompleted && (
                <span className="text-[9px] font-bold font-mono text-amber-300/90 bg-black/70 px-1.5 py-0.5 rounded">
                  RESUME
                </span>
              )}
              <EpisodeAudioMarks episodeNumber={props.episode.number} subOrDub={props.subOrDub} />
            </div>

            {progressPct > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40">
                <div
                  className="h-full bg-zinc-300/90"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>

          <div className="px-2.5 py-1.5 bg-[#0a0a0a] flex items-center gap-2 min-w-0">
            <p className={cn(
              "text-[11px] leading-tight line-clamp-1 font-medium flex-1 min-w-0",
              isActive ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-white/50 group-hover:text-foreground/90 dark:group-hover:text-white/80",
            )}>
              {hasMeaningfulTitle ? props.episode.title : `Episode ${props.episode.number}`}
            </p>
            {isInProgress && current > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground/80 dark:text-white/25 shrink-0">
                {Math.floor(current / 60)}:{String(Math.floor(current % 60)).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </EpisodeCardShell>
    );
  }
  if (showCard && variant === "card") {
    return (
      <div className={cn("rounded-xl overflow-hidden relative cursor-pointer h-[8.625rem] min-w-[8.625rem] max-w-[10.625rem] md:h-[10.75rem] md:max-w-[12.5rem]", props.className)}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-0 flex flex-col gap-0.5 px-3 pb-2">
          <span className="text-[10px] text-muted-foreground dark:text-white/50 font-mono">EP {props.episode.number}</span>
          <h5 className="line-clamp-1 text-xs font-semibold text-foreground dark:text-white">{props.episode.title}</h5>
        </div>
      </div>
    );
  }

  // ── List variant — Crunchyroll-style thumbnail row ───────────────
  const listHistory = props.watchedEpisodes?.find((w) => w.episodeId === props.episode.episodeId);
  const listCurrent = listHistory?.current ?? 0;
  const listDuration = listHistory?.duration ?? 0;
  const listProgressPct = listDuration > 0 ? Math.min(100, (listCurrent / listDuration) * 100) : 0;
  const listInProgress = listCurrent > 10 && listProgressPct < 95;
  const listCompleted = listProgressPct >= 95 || (hasWatchedEpisode && !listInProgress);

  return (
    <EpisodeCardShell playable={playable} href={href} title={unreleasedTitle}>
      <div
        className={cn(
          "group flex gap-0 mx-1 mb-px rounded-lg transition-colors relative overflow-hidden",
          playable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
          isActive
            ? "bg-teal-500/12 ring-1 ring-teal-400/35"
            : props.episode.isFiller
              ? "bg-amber-500/[0.06] ring-1 ring-amber-500/18 hover:bg-amber-500/[0.1]"
              : playable && "hover:bg-accent dark:hover:bg-white/[0.05]",
          hasWatchedEpisode && !isActive && "opacity-55",
        )}
      >
        {isActive ? (
          <span className="absolute inset-y-0 left-0 w-[2px] bg-teal-300/90 z-10" />
        ) : props.episode.isFiller ? (
          <span className="absolute inset-y-0 left-0 w-[2px] bg-amber-400/70 z-10" />
        ) : null}
        <div className="relative shrink-0 w-[96px] rounded-l-lg overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {props.episode.image ? (
              <Image
                src={props.episode.image}
                alt={`EP ${props.episode.number}`}
                fill
                className="object-cover"
                unoptimized
                sizes="96px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-white/[0.02] flex items-center justify-center">
                <span className="text-xl font-black font-mono text-muted-foreground/20 dark:text-white/8 select-none">
                  {String(props.episode.number).padStart(2, "0")}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            <span className="absolute bottom-1 left-1 text-[9px] font-mono font-bold text-foreground dark:text-white/90 bg-black/70 px-1.5 py-0.5 rounded">
              EP {props.episode.number}
            </span>

            {listCompleted && (
              <div className="absolute top-1 left-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-zinc-300/90">
                <Check className="w-2 h-2 text-zinc-950" />
              </div>
            )}

            {listProgressPct > 0 && !listCompleted && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/40">
                <div className="h-full bg-zinc-300/85" style={{ width: `${listProgressPct}%` }} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 px-2.5 py-2 flex flex-col justify-center gap-1">
          <p
            className={cn(
              "text-[12px] font-medium leading-snug line-clamp-2",
              isActive ? "text-foreground dark:text-white" : "text-foreground/80 dark:text-white/70 group-hover:text-foreground dark:group-hover:text-white/90",
            )}
          >
            {hasMeaningfulTitle ? props.episode.title : `Episode ${props.episode.number}`}
          </p>
          {props.episode.overview && (
            <p className="text-[10px] leading-snug text-muted-foreground/70 dark:text-white/30 line-clamp-1">
              {props.episode.overview}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {props.episode.isFiller && (
              <span className="inline-flex items-center rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-px text-[9px] font-mono font-bold uppercase tracking-wide text-amber-300/90">
                Filler
              </span>
            )}
            <EpisodeAudioMarks episodeNumber={props.episode.number} subOrDub={props.subOrDub} />
            {listInProgress && listCurrent > 0 && (
              <span className="text-[9px] font-mono text-amber-300/60 ml-auto">
                {Math.floor(listCurrent / 60)}:{String(Math.floor(listCurrent % 60)).padStart(2, "0")}
              </span>
            )}
            {!listInProgress && props.episode.airDate && (
              <span className="text-[9px] font-mono text-muted-foreground/70 dark:text-white/30 ml-auto">
                {props.episode.airDate}
              </span>
            )}
            {!listInProgress && props.episode.rating != null && props.episode.rating > 0 && (
              <span className="text-[9px] font-mono text-emerald-300/70">
                {Math.round(props.episode.rating * 10)}%
              </span>
            )}
            {props.episode.runtime != null && props.episode.runtime > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground/60 dark:text-white/25">
                {props.episode.runtime}m
              </span>
            )}
          </div>
        </div>
      </div>
    </EpisodeCardShell>
  );
});

export default EpisodeCard;
