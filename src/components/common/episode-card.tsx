"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { Episode } from "@/types/episodes";
import { useAnimeStore } from "@/store/anime-store";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";
import { Captions, Check, Mic, Play } from "lucide-react";
import Link from "next/link";
import { WatchHistory } from "@/hooks/use-get-bookmark";

type Props = {
  className?: string;
  episode: Episode;
  showCard?: boolean;
  animeId: string;
  variant?: "card" | "list" | "thumbnail";
  subOrDub?: { sub: number; dub: number };
  watchedEpisodes?: WatchHistory[] | null;
  animePoster?: string;
};

const EpisodeCard = ({
  showCard = false,
  variant = "card",
  ...props
}: Props) => {
  const { selectedEpisode } = useAnimeStore();
  const { hasWatchedEpisode } = useHasAnimeWatched(
    props.animeId,
    props.episode.episodeId,
    props.watchedEpisodes!,
  );

  const isActive = selectedEpisode === props.episode.episodeId;
  const hasMeaningfulTitle =
    props.episode.title &&
    props.episode.title.toLowerCase() !== `episode ${props.episode.number}`;

  const href = `${ROUTES.WATCH}?anime=${props.animeId}&episode=${props.episode.episodeId}`;

  // ── Compact number grid cell ──────────────────────────────────────
  if (!showCard && variant === "card") {
    return (
      <Link href={href}>
        <div
          className={cn(
            "h-[5.25rem] rounded-lg cursor-pointer w-full flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all",
            isActive
              ? "bg-white/15 ring-1 ring-white/30 text-white"
              : "bg-white/5 hover:bg-white/10 text-white/60",
            hasWatchedEpisode && !isActive && "opacity-50",
          )}
        >
          <span className="font-mono font-bold">{props.episode.number}</span>
          {hasWatchedEpisode && <Check className="w-3 h-3 opacity-50" />}
        </div>
      </Link>
    );
  }

  // ── Thumbnail card ────────────────────────────────────────────────
  if (variant === "thumbnail") {
    // Find resume data for this episode
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
      <Link href={href}>
        <div
          className={cn(
            "group rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border",
            isActive
              ? "border-white/35 ring-1 ring-white/15"
              : "border-white/8 hover:border-white/20",
          )}
        >
          {/* Thumbnail image area */}
          <div className="relative aspect-[16/9] bg-[#0d0d0d] overflow-hidden">
            {episodeImage ? (
              <Image
                src={episodeImage}
                alt={`Episode ${props.episode.number}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
                sizes="(max-width: 640px) 50vw, 200px"
              />
            ) : (
              /* No screenshot available — show a clean dark numbered placeholder */
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-transparent">
                <span className="text-3xl font-black font-mono text-white/8 select-none">
                  {String(props.episode.number).padStart(2, "0")}
                </span>
              </div>
            )}

            {/* Dark overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

            {/* Play button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-xl">
                <Play className="w-3.5 h-3.5 text-black fill-black" />
              </div>
            </div>

            {/* Bottom-left: ep number + filler badge */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-white/85 bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded">
                EP {props.episode.number}
              </span>
              {props.episode.isFiller && (
                <span className="text-[9px] font-mono text-amber-400/80 bg-black/55 px-1 py-0.5 rounded">
                  FILLER
                </span>
              )}
            </div>

            {/* Top-right: sub/dub + completed */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              {isCompleted && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/80 backdrop-blur-sm">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
              {isInProgress && !isCompleted && (
                <span className="text-[9px] font-bold font-mono text-amber-300/90 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  RESUME
                </span>
              )}
              {props.subOrDub && props.episode.number <= props.subOrDub.sub && (
                <Captions className="w-3 h-3 text-sky-400/70" />
              )}
              {props.subOrDub && props.episode.number <= props.subOrDub.dub && (
                <Mic className="w-3 h-3 text-purple-400/70" />
              )}
            </div>

            {/* Progress bar — only shown if in progress */}
            {progressPct > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/40">
                <div
                  className="h-full bg-amber-400/90 transition-none"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>

          {/* Title row */}
          <div className="px-2.5 py-2 bg-[#0a0a0a] flex items-center gap-2 min-w-0">
            <p className={cn(
              "text-[11px] leading-tight line-clamp-1 font-medium flex-1 min-w-0",
              isActive ? "text-white" : "text-white/50 group-hover:text-white/80",
            )}>
              {hasMeaningfulTitle ? props.episode.title : `Episode ${props.episode.number}`}
            </p>
            {isInProgress && current > 0 && (
              <span className="text-[9px] font-mono text-white/25 shrink-0">
                {Math.floor(current / 60)}:{String(Math.floor(current % 60)).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  if (showCard && variant === "card") {
    return (
      <div className={cn("rounded-xl overflow-hidden relative cursor-pointer h-[8.625rem] min-w-[8.625rem] max-w-[10.625rem] md:h-[10.75rem] md:max-w-[12.5rem]", props.className)}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-0 flex flex-col gap-0.5 px-3 pb-2">
          <span className="text-[10px] text-white/50 font-mono">EP {props.episode.number}</span>
          <h5 className="line-clamp-1 text-xs font-semibold text-white">{props.episode.title}</h5>
        </div>
      </div>
    );
  }

  // ── List variant ─────────────────────────────────────────────────
  return (
    <Link href={href}>
      <div
        className={cn(
          "group flex items-center gap-3 mx-1 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all relative",
          isActive
            ? "bg-white/10 border-l-2 border-white/60"
            : "hover:bg-white/5 border-l-2 border-transparent",
          hasWatchedEpisode && !isActive && "opacity-55",
        )}
      >
        {/* Ep number */}
        <span
          className={cn(
            "text-[11px] font-mono font-bold w-7 text-center shrink-0 tabular-nums",
            isActive ? "text-white" : "text-white/35",
          )}
        >
          {props.episode.number}
        </span>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-[13px] leading-tight line-clamp-1",
              isActive ? "text-white font-semibold" : "text-white/65 group-hover:text-white/85",
            )}
          >
            {hasMeaningfulTitle ? props.episode.title : `Episode ${props.episode.number}`}
          </p>
          {hasMeaningfulTitle && (
            <p className="text-[10px] text-white/25 font-mono mt-0.5">EP {props.episode.number}</p>
          )}
        </div>

        {/* Right indicators */}
        <div className="flex items-center gap-1.5 shrink-0">
          {props.episode.isFiller && (
            <span className="text-[8px] font-mono text-yellow-400/50 bg-yellow-900/30 px-1 py-0.5 rounded">
              FILLER
            </span>
          )}
          {hasWatchedEpisode && <Check className="w-3 h-3 text-white/30" />}
          {props.subOrDub && props.episode.number <= props.subOrDub.sub && (
            <Captions className="w-3 h-3 text-white/25" />
          )}
          {props.subOrDub && props.episode.number <= props.subOrDub.dub && (
            <Mic className="w-3 h-3 text-white/25" />
          )}
        </div>
      </div>
    </Link>
  );
};

export default EpisodeCard;
