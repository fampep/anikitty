"use client";

import { Flame, Award, Clock, Tv, Film, Star, TrendingUp } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { formatWatchTime } from "@/lib/history/derive";
import type { HistoryStats, Milestone } from "@/lib/history/types";
import { HistoryBarChart, HistoryDonut } from "@/components/history/history-charts";
import HistoryHeatmap from "@/components/history/history-heatmap";
import { cn } from "@/lib/core/utils";

type Props = {
  stats: HistoryStats;
  streaks: {
    current: number;
    longest: number;
    last7: number;
    last30: number;
    last100: number;
  };
  milestones: Milestone[];
};

const MILESTONE_KEYS: Record<string, string> = {
  eps_100: "history.milestones.eps100",
  eps_500: "history.milestones.eps500",
  completed_100: "history.milestones.completed100",
  hours_1000: "history.milestones.hours1000",
  streak_7: "history.milestones.streak7",
  streak_30: "history.milestones.streak30",
  streak_100: "history.milestones.streak100",
  streak_365: "history.milestones.streak365",
};

export default function HistoryStatisticsView({ stats, streaks, milestones }: Props) {
  const t = useT();

  const cards = [
    {
      icon: Tv,
      label: t("history.stats.anime"),
      value: String(stats.totalAnime),
    },
    {
      icon: Film,
      label: t("history.stats.episodes"),
      value: String(stats.totalEpisodes),
    },
    {
      icon: Clock,
      label: t("history.stats.watchTime"),
      value: formatWatchTime(stats.watchTimeSeconds),
    },
    {
      icon: Star,
      label: t("history.stats.avgRating"),
      value: stats.avgRating != null ? stats.avgRating.toFixed(1) : "—",
    },
    {
      icon: Flame,
      label: t("history.stats.streak"),
      value: String(stats.currentStreak),
    },
    {
      icon: TrendingUp,
      label: t("history.stats.epsPerDay"),
      value: stats.avgEpsPerDay.toFixed(1),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="site-panel rounded-xl p-3">
            <div className="mb-2 flex items-center gap-1.5 text-white/35">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className="font-mono text-xl font-bold tabular-nums text-white/90">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-1 text-sm font-bold text-white/85">{t("history.stats.favorites")}</h3>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-white/40">{t("history.stats.favGenre")}</dt>
              <dd className="font-semibold text-white/75">
                {stats.favoriteGenre ?? t("history.stats.unknown")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/40">{t("history.stats.favStudio")}</dt>
              <dd className="font-semibold text-white/75">
                {stats.favoriteStudio ?? t("history.stats.unknown")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/40">{t("history.stats.favVa")}</dt>
              <dd className="font-semibold text-white/75">
                {stats.favoriteVa ?? t("history.stats.unknown")}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/40">{t("history.stats.hoursPerWeek")}</dt>
              <dd className="font-mono font-semibold text-white/75">
                {stats.avgHoursPerWeek.toFixed(1)}h
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/40">{t("history.stats.movies")}</dt>
              <dd className="font-mono font-semibold text-white/75">{stats.totalMovies}</dd>
            </div>
          </dl>
        </div>

        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-white/85">
            <Flame className="h-4 w-4 text-orange-300/80" />
            {t("history.stats.streaksTitle")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              [t("history.stats.currentStreak"), streaks.current],
              [t("history.stats.longestStreak"), streaks.longest],
              [t("history.stats.streak7"), streaks.last7],
              [t("history.stats.streak30"), streaks.last30],
              [t("history.stats.streak100"), streaks.last100],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <p className="text-[10px] text-white/35">{label}</p>
                <p className="font-mono text-lg font-bold text-white/85">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="site-panel rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-white/85">
          <Award className="h-4 w-4 text-amber-300/80" />
          {t("history.milestones.title")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                m.unlocked
                  ? "border-foreground/20 bg-foreground/[0.06] dark:border-white/25 dark:bg-white/[0.07]"
                  : "border-white/[0.06] bg-white/[0.02]",
              )}
            >
              <p className="text-[12px] font-semibold text-white/80">
                {t(MILESTONE_KEYS[m.id] ?? m.id)}
              </p>
              <div className="history-progress mt-2 h-1.5 overflow-hidden rounded-full">
                <span
                  className={cn(!m.unlocked && "opacity-55")}
                  style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[10px] text-white/35">
                {Math.round(m.progress)} / {m.target}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="site-panel rounded-2xl p-4">
        <HistoryHeatmap activity={stats.activityByDay} metric="episodes" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.hoursByMonth")}
          </h3>
          <HistoryBarChart
            data={stats.hoursByMonth.map((d) => ({ label: d.key, value: d.hours }))}
            formatValue={(n) => `${n}h`}
            barClassName="fill-sky-400/75"
          />
        </div>
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.epsByWeek")}
          </h3>
          <HistoryBarChart
            data={stats.epsByWeek.map((d) => ({ label: d.key, value: d.episodes }))}
            barClassName="fill-emerald-400/75"
          />
        </div>
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.weekdayHabits")}
          </h3>
          <HistoryBarChart
            data={stats.weekdayHabits.map((d) => ({ label: d.label, value: d.count }))}
            barClassName="fill-amber-400/70"
          />
        </div>
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.hourHabits")}
          </h3>
          <HistoryBarChart
            data={stats.hourHabits.map((d) => ({ label: d.label, value: d.count }))}
            barClassName="fill-cyan-400/70"
            height={100}
          />
        </div>
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.ratingDist")}
          </h3>
          <HistoryBarChart
            data={stats.ratingDist.map((d) => ({ label: d.label, value: d.count }))}
            barClassName="fill-amber-300/80"
          />
        </div>
        <div className="site-panel rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold text-white/85">
            {t("history.stats.typeDist")}
          </h3>
          <HistoryDonut
            data={
              stats.typeDist.length
                ? stats.typeDist.map((d) => ({ label: d.label, value: d.count }))
                : stats.genreDist.map((d) => ({ label: d.label, value: d.count }))
            }
          />
        </div>
      </div>
    </div>
  );
}
