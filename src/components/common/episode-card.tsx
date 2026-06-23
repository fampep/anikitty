"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { Episode } from "@/types/episodes";
import { useAnimeStore } from "@/store/anime-store";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";
import { Captions, Check, Mic } from "lucide-react";
import Link from "next/link";
import { WatchHistory } from "@/hooks/use-get-bookmark";

type Props = {
  className?: string;
  episode: Episode;
  showCard?: boolean;
  animeId: string;
  variant?: "card" | "list";
  subOrDub?: { sub: number; dub: number };
  watchedEpisodes?: WatchHistory[] | null;
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

  if (!showCard && variant === "card") {
    return (
      <Link href={`${ROUTES.WATCH}?anime=${props.animeId}&episode=${props.episode.episodeId}`}>
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

  // List variant — the main one used in the episode playlist sidebar
  return (
    <Link href={`${ROUTES.WATCH}?anime=${props.animeId}&episode=${props.episode.episodeId}`}>
      <div
        className={cn(
          "group flex items-center gap-3 mx-1 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all relative",
          isActive
            ? "bg-white/10 border-l-2 border-white/60"
            : "hover:bg-white/5 border-l-2 border-transparent",
          hasWatchedEpisode && !isActive && "opacity-55",
        )}
      >
        {/* Ep number pill */}
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

        {/* Right side indicators */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasWatchedEpisode && (
            <Check className="w-3 h-3 text-white/30" />
          )}
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
