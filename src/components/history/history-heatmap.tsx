"use client";

import { useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip } from "react-tooltip";
import type { DayActivity } from "@/lib/history/types";
import { useT } from "@/providers/i18n-provider";
import styles from "./history-heatmap.module.css";
import { cn } from "@/lib/core/utils";

type Props = {
  activity: DayActivity[];
  metric?: "episodes" | "minutes";
  className?: string;
};

export default function HistoryHeatmap({ activity, metric = "episodes", className }: Props) {
  const t = useT();
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  const values = useMemo(
    () =>
      activity.map((a) => ({
        date: a.date,
        count: metric === "minutes" ? a.minutes : a.episodes,
      })),
    [activity, metric],
  );

  const total = values.reduce((s, v) => s + v.count, 0);

  const getClass = (value: { count?: number } | null) => {
    if (!value || !value.count) return styles.colorEmpty;
    if (value.count >= 10) return styles.hm4;
    if (value.count >= 5) return styles.hm3;
    if (value.count >= 2) return styles.hm2;
    return styles.hm1;
  };

  return (
    <div className={cn("w-full [&_.react-calendar-heatmap]:w-full", className)}>
      <p className="mb-3 text-sm font-semibold text-white/80">
        {metric === "minutes"
          ? t("history.stats.heatmapMinutes", { count: total })
          : t("history.stats.heatmapEpisodes", { count: total })}
      </p>
      <CalendarHeatmap
        weekdayLabels={["", "M", "", "W", "", "F", ""]}
        showWeekdayLabels
        showOutOfRangeDays
        startDate={startDate}
        endDate={endDate}
        classForValue={(v) => getClass(v as { count?: number } | null)}
        values={values}
        gutterSize={2}
        tooltipDataAttrs={((v: unknown) => {
          const val = v as { date?: string; count?: number } | null;
          const base = { "data-tooltip-id": "history-heatmap-tooltip" };
          if (!val?.date) {
            return { ...base, "data-tooltip-content": t("history.stats.heatmapEmpty") };
          }
          const d = new Date(val.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const unit =
            metric === "minutes"
              ? t("history.stats.minutesUnit", { n: val.count ?? 0 })
              : t("history.stats.episodesUnit", { n: val.count ?? 0 });
          return { ...base, "data-tooltip-content": `${unit} · ${d}` };
        }) as never}
      />
      <Tooltip id="history-heatmap-tooltip" />
    </div>
  );
}
