"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { formatWatchTime } from "@/lib/history/derive";
import type { HistoryStats } from "@/lib/history/types";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  CheckCircle,
  Clock,
  Film,
  Flame,
  Star,
  Tv,
  Library,
  type LucideIcon,
} from "lucide-react";

type Counts = {
  watching: number;
  completed: number;
  plan: number;
  onHold: number;
  dropped: number;
};

type Props = {
  stats: HistoryStats;
  counts: Counts;
  streak: number;
  loading?: boolean;
  className?: string;
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  numeric,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
  numeric?: number;
}) {
  const { value: animated, ref } = useCountUp(numeric ?? 0, {
    enabled: numeric != null,
    durationMs: 900,
  });
  const display = numeric != null ? animated.toLocaleString() : value;

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.03] p-3"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground/70 dark:text-white/35">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-mono text-xl font-bold tabular-nums text-foreground dark:text-white/90">
        {display}
      </p>
    </div>
  );
}

export default function ProfileStatsCards({ stats, counts, streak, loading, className }: Props) {
  const t = useT();
  const totalList =
    counts.watching + counts.completed + counts.plan + counts.onHold + counts.dropped;

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          icon={CheckCircle}
          label={t("profile.hub.statsCompleted")}
          value={stats.completedCount}
          numeric={stats.completedCount}
          accent="text-emerald-400"
        />
        <StatCard
          icon={Film}
          label={t("profile.hub.statsMovies")}
          value={stats.totalMovies}
          numeric={stats.totalMovies}
          accent="text-violet-300"
        />
        <StatCard
          icon={Tv}
          label={t("profile.hub.statsEpisodes")}
          value={stats.totalEpisodes}
          numeric={stats.totalEpisodes}
          accent="text-sky-300"
        />
        <StatCard
          icon={Clock}
          label={t("profile.hub.statsHours")}
          value={formatWatchTime(stats.watchTimeSeconds)}
          accent="text-amber-300"
        />
        <StatCard
          icon={Star}
          label={t("profile.hub.statsAvgRating")}
          value={stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
          accent="text-yellow-300"
        />
        <StatCard
          icon={Flame}
          label={t("profile.hub.statsStreak")}
          value={streak}
          numeric={streak}
          accent="text-orange-400"
        />
        <StatCard
          icon={Library}
          label={t("profile.hub.libraryBreakdown")}
          value={totalList}
          numeric={totalList}
          accent="text-zinc-300"
        />
        <StatCard
          icon={Tv}
          label={t("profile.hub.watching")}
          value={counts.watching}
          numeric={counts.watching}
          accent="text-sky-400"
        />
      </div>

      {(stats.favoriteGenre || stats.favoriteStudio || stats.favoriteVa) && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {stats.favoriteGenre && (
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-white/55">
              {t("profile.hub.statsFavGenre")}:{" "}
              <span className="font-semibold text-white/80">{stats.favoriteGenre}</span>
            </span>
          )}
          {stats.favoriteStudio && (
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-white/55">
              {t("profile.hub.statsFavStudio")}:{" "}
              <span className="font-semibold text-white/80">{stats.favoriteStudio}</span>
            </span>
          )}
          {stats.favoriteVa && (
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-white/55">
              {t("profile.hub.statsFavVa")}:{" "}
              <span className="font-semibold text-white/80">{stats.favoriteVa}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
