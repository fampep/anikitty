"use client";

import { useMemo } from "react";
import { BarChart3, Clock, Film, Timer } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { WatchHistory } from "@/hooks/use-get-bookmark";
import type { Episode } from "@/types/episodes";

type Props = {
  currentEpisode: Episode | null;
  totalEpisodes: number;
  watchedEpisodes: WatchHistory[];
  /** Live player position for the current episode (seconds). */
  liveCurrent?: number;
  liveDuration?: number;
  className?: string;
  compact?: boolean;
};

function formatSeconds(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.ceil(seconds / 60);
  if (m < 60) return `~${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `~${h}h ${rem}m` : `~${h}h`;
}

export default function WatchStatsPanel({
  currentEpisode,
  totalEpisodes,
  watchedEpisodes,
  liveCurrent = 0,
  liveDuration = 0,
  className,
  compact = false,
}: Props) {
  const t = useT();

  const stats = useMemo(() => {
    const completed = watchedEpisodes.filter((w) => {
      const duration = w.duration ?? 0;
      const current = w.current ?? 0;
      if (duration <= 0) return current > 60;
      return current / duration >= 0.9;
    }).length;

    let watchedSec = 0;
    for (const w of watchedEpisodes) {
      const current = w.current ?? 0;
      const duration = w.duration ?? 0;
      watchedSec += Math.min(Math.max(0, current), duration > 0 ? duration : current);
    }

    const epRuntimeMin = currentEpisode?.runtime;
    const epDuration =
      liveDuration > 0
        ? liveDuration
        : epRuntimeMin && epRuntimeMin > 0
          ? epRuntimeMin * 60
          : 0;

    const remainingEp =
      epDuration > 0 ? Math.max(0, epDuration - Math.max(0, liveCurrent)) : 0;

    const seriesPct =
      totalEpisodes > 0
        ? Math.min(100, Math.round((completed / totalEpisodes) * 100))
        : 0;

    const remainingEps = Math.max(0, totalEpisodes - completed);
    const avgRuntime =
      epDuration > 0
        ? epDuration
        : epRuntimeMin && epRuntimeMin > 0
          ? epRuntimeMin * 60
          : 24 * 60;
    const seriesEtaSec = remainingEps * avgRuntime + remainingEp;

    return {
      completed,
      seriesPct,
      watchedSec,
      remainingEp,
      seriesEtaSec,
      epDuration,
    };
  }, [watchedEpisodes, totalEpisodes, currentEpisode?.runtime, liveCurrent, liveDuration]);

  if (!currentEpisode || totalEpisodes <= 0) return null;

  const rows = [
    {
      icon: Film,
      label: t("watch.stats.current"),
      value: t("watch.episodeShort", { n: currentEpisode.number }),
    },
    {
      icon: BarChart3,
      label: t("watch.stats.watched"),
      value: `${stats.completed}/${totalEpisodes} · ${stats.seriesPct}%`,
    },
    {
      icon: Clock,
      label: t("watch.stats.timeWatched"),
      value: formatSeconds(stats.watchedSec),
    },
    {
      icon: Timer,
      label: t("watch.stats.remaining"),
      value:
        stats.remainingEp > 0
          ? `${formatSeconds(stats.remainingEp)} · ETA ${formatEta(stats.seriesEtaSec)}`
          : formatEta(stats.seriesEtaSec),
    },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 dark:border-white/[0.07] bg-muted/10 dark:bg-white/[0.02]",
        compact ? "p-2.5" : "p-3 sm:p-3.5",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground dark:text-white/35" />
        <h3 className="text-[12px] font-semibold tracking-tight text-foreground/85 dark:text-white/75">
          {t("watch.stats.title")}
        </h3>
      </div>
      <div className={cn("grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-border/40 dark:border-white/[0.05] bg-background/40 dark:bg-black/20 px-2 py-1.5 min-w-0"
          >
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 dark:text-white/30">
              <row.icon className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{row.label}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-medium tabular-nums text-foreground/90 dark:text-white/80">
              {row.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-accent dark:bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-zinc-300/80 dark:bg-zinc-400/70 transition-[width] duration-500"
          style={{ width: `${stats.seriesPct}%` }}
        />
      </div>
    </div>
  );
}
