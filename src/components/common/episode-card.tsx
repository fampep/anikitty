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
    return (
      <Link href={href}>
        <div
          className={cn(
            "group rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border",
            isActive
              ? "border-white/30 ring-1 ring-white/20"
              : "border-white/8 hover:border-white/20",
            hasWatchedEpisode && !isActive && "opacity-55",
          )}
        >
          {/* Thumbnail */}
          <div className="relative aspect-[16/9] bg-black overflow-hidden">
            {props.animePoster ? (
              <Image
                src={props.animePoster}
                alt={`Episode ${props.episode.number}`}
                fill
                className="object-cover scale-110 group-hover:scale-100 transition-transform duration-300 blur-[1px] group-hover:blur-0"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-white/5" />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-white/90 rounded-full p-2 shadow-lg">
                <Play className="w-4 h-4 text-black fill-black" />
              </div>
            </div>

            {/* Ep number */}
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded">
                EP {props.episode.number}
              </span>
              {props.episode.isFiller && (
                <span className="text-[9px] font-mono text-yellow-400/70 bg-yellow-900/40 px-1 py-0.5 rounded">
                  FILLER
                </span>
              )}
              {hasWatchedEpisode && (
                <Check className="w-3 h-3 text-white/50" />
              )}
            </div>

            {/* Sub/dub dots */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              {props.subOrDub && props.episode.number <= props.subOrDub.sub && (
                <Captions className="w-3 h-3 text-sky-400/70" />
              )}
              {props.subOrDub && props.episode.number <= props.subOrDub.dub && (
                <Mic className="w-3 h-3 text-purple-400/70" />
              )}
            </div>
          </div>

          {/* Title below thumbnail */}
          <div className="px-2.5 py-2 bg-[#0a0a0a]">
            <p className={cn(
              "text-[11px] leading-tight line-clamp-1 font-medium",
              isActive ? "text-white" : "text-white/55 group-hover:text-white/80",
            )}>
              {hasMeaningfulTitle ? props.episode.title : `Episode ${props.episode.number}`}
            </p>
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
