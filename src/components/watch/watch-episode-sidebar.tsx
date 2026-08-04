"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import { cn } from "@/lib/core/utils";

export default function WatchEpisodeSidebar() {
  const searchParams = useSearchParams();
  const animeId = searchParams.get("anime");
  const currentEpisode = searchParams.get("episode");

  const { data: episodesData } = useGetAllEpisodes(animeId ?? "");
  const episodes = episodesData?.episodes ?? [];

  if (!episodes.length) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No episodes available
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30 dark:divide-white/5">
      {episodes.slice(0, 50).map((episode, idx) => {
        const isPlaying = currentEpisode === episode.episodeId;
        const epNum = idx + 1;

        return (
          <Link
            key={episode.episodeId}
            href={`/anime/watch?anime=${animeId}&episode=${episode.episodeId}`}
            className={cn(
              "flex gap-3 p-3 hover:bg-muted/50 dark:hover:bg-white/10 transition-colors",
              isPlaying && "bg-primary/20 dark:bg-primary/20 border-l-2 border-primary"
            )}
          >
            {/* Episode Thumbnail */}
            <div className="relative h-14 w-20 shrink-0 rounded overflow-hidden bg-muted/30 dark:bg-white/5">
              {episode.image ? (
                <Image
                  src={episode.image}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/50">
                  No image
                </div>
              )}
              {/* Episode Number Badge */}
              <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white">
                EP {epNum}
              </div>
            </div>

            {/* Episode Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-xs font-medium text-foreground/90 dark:text-white/80 truncate">
                {episode.title || `Episode ${epNum}`}
              </p>
              {isPlaying && (
                <p className="text-[10px] text-primary font-semibold mt-0.5">Playing</p>
              )}
            </div>

            {/* Episode Played Indicator */}
            {isPlaying && (
              <div className="flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
