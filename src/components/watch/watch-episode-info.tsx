"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Clock, Users } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { Episode } from "@/types/episodes";

type Props = {
  episode: Episode;
  /** Best-effort cast / VA line when available from anime details. */
  castLine?: string | null;
  className?: string;
};

const SYNOPSIS_COLLAPSE_CHARS = 220;

export default function WatchEpisodeInfo({ episode, castLine, className }: Props) {
  const t = useT();
  const overview = episode.overview?.trim() || "";
  const needsCollapse = overview.length > SYNOPSIS_COLLAPSE_CHARS;
  const [expanded, setExpanded] = useState(false);

  const hasMeta =
    Boolean(overview) ||
    Boolean(episode.airDate) ||
    (episode.runtime != null && episode.runtime > 0) ||
    Boolean(castLine) ||
    episode.isFiller ||
    episode.isRecap;

  if (!hasMeta) return null;

  const shown =
    !needsCollapse || expanded
      ? overview
      : `${overview.slice(0, SYNOPSIS_COLLAPSE_CHARS).trimEnd()}…`;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 dark:border-white/[0.07] bg-transparent p-3 sm:p-3.5 space-y-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground/90 dark:text-white/85">
          {t("watch.episodeInfo.title", { n: episode.number })}
        </h3>
        {episode.isRecap ? (
          <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-px text-[9px] font-mono font-bold uppercase tracking-wide text-sky-300/90">
            {t("watch.episodeInfo.recap")}
          </span>
        ) : episode.isFiller ? (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-px text-[9px] font-mono font-bold uppercase tracking-wide text-amber-300/90">
            {t("watch.filler")}
          </span>
        ) : null}
      </div>

      {episode.title &&
        episode.title.toLowerCase() !== `episode ${episode.number}` && (
          <p className="text-[12px] text-muted-foreground dark:text-white/50 leading-snug">
            {episode.title}
          </p>
        )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground dark:text-white/40">
        {episode.airDate ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3 opacity-70" />
            {episode.airDate}
          </span>
        ) : null}
        {episode.runtime != null && episode.runtime > 0 ? (
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="h-3 w-3 opacity-70" />
            {episode.runtime}m
          </span>
        ) : null}
        {castLine ? (
          <span className="inline-flex items-center gap-1 min-w-0">
            <Users className="h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate">{castLine}</span>
          </span>
        ) : null}
      </div>

      {overview ? (
        <div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground dark:text-white/55">
            {shown}
          </p>
          {needsCollapse ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
            >
              {expanded ? t("watch.episodeInfo.showLess") : t("watch.episodeInfo.showMore")}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
