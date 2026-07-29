"use client";

import { useMemo } from "react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { ScoreDistribution, StatusDistribution } from "@/types/anime-details";

const STATUS_COLORS: Record<string, string> = {
  CURRENT: "bg-emerald-500/80",
  PLANNING: "bg-sky-500/80",
  COMPLETED: "bg-teal-500/80",
  DROPPED: "bg-rose-500/70",
  PAUSED: "bg-amber-500/70",
  REPEATING: "bg-violet-500/70",
};

const STATUS_LABELS: Record<string, string> = {
  CURRENT: "Watching",
  PLANNING: "Plan to Watch",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
  PAUSED: "On Hold",
  REPEATING: "Rewatching",
};

type Props = {
  statusDistribution?: StatusDistribution[];
  scoreDistribution?: ScoreDistribution[];
  className?: string;
};

export default function AnimeStatsCharts({
  statusDistribution,
  scoreDistribution,
  className,
}: Props) {
  const t = useT();

  const status = useMemo(() => {
    const list = statusDistribution ?? [];
    const total = list.reduce((sum, s) => sum + s.amount, 0);
    if (total <= 0) return [];
    return list
      .map((s) => ({
        ...s,
        pct: (s.amount / total) * 100,
        label: STATUS_LABELS[s.status] ?? s.status,
        color: STATUS_COLORS[s.status] ?? "bg-zinc-500/70",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [statusDistribution]);

  const scores = useMemo(() => {
    const list = [...(scoreDistribution ?? [])].sort((a, b) => a.score - b.score);
    const max = Math.max(...list.map((s) => s.amount), 1);
    return list.map((s) => ({ ...s, pct: (s.amount / max) * 100 }));
  }, [scoreDistribution]);

  if (status.length === 0 && scores.length === 0) return null;

  return (
    <section className={cn("site-panel p-5 sm:p-6 space-y-6", className)}>
      <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest">
        {t("anime.stats.title")}
      </h3>

      {status.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground dark:text-white/40 mb-3">
            {t("anime.stats.statusDistribution")}
          </p>
          <div className="flex h-3 rounded-full overflow-hidden ring-1 ring-white/8">
            {status.map((s) => (
              <div
                key={s.status}
                className={cn("h-full", s.color)}
                style={{ width: `${s.pct}%` }}
                title={`${s.label}: ${s.amount.toLocaleString()}`}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {status.map((s) => (
              <div key={s.status} className="flex items-center gap-2 text-[11px]">
                <span className={cn("h-2 w-2 rounded-full shrink-0", s.color)} />
                <span className="text-muted-foreground dark:text-white/45 truncate">{s.label}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground/70 dark:text-white/60">
                  {s.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scores.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground dark:text-white/40 mb-3">
            {t("anime.stats.scoreDistribution")}
          </p>
          <div className="flex items-end gap-1 h-28">
            {scores.map((s) => (
              <div key={s.score} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div
                  className="w-full rounded-t-sm bg-amber-400/70 min-h-[2px] transition-all"
                  style={{ height: `${Math.max(4, s.pct)}%` }}
                  title={`${s.score}: ${s.amount.toLocaleString()}`}
                />
                <span className="text-[9px] font-mono text-muted-foreground/70 dark:text-white/30 tabular-nums">
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
