"use client";

import React, { useEffect, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import styles from "../heatmap.module.css";
import { useAuthStore } from "@/store/auth-store";
import { Tooltip } from "react-tooltip";
import { anisurgeContinue } from "@/lib/anisurge";

type HeatmapValue = {
  date: string;
  count: number;
};

function AnimeHeatmap() {
  const { auth } = useAuthStore();
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const startDate = new Date(new Date().setMonth(0, 1));
  const endDate = new Date(new Date().setMonth(11, 31));

  useEffect(() => {
    if (!auth) return;

    (async () => {
      try {
        const res = await anisurgeContinue.get(false, 100, 0);
        const items: any[] = res?.data ?? [];

        const daily: Record<string, number> = {};
        for (const item of items) {
          const ts = item.lastUpdated ?? item.updatedAt ?? item.created_at;
          if (!ts) continue;
          const date = ts.substring(0, 10);
          daily[date] = (daily[date] ?? 0) + 1;
        }

        setHeatmapData(Object.entries(daily).map(([date, count]) => ({ date, count })));
        setTotalCount(items.length);
      } catch {
        setHeatmapData([]);
        setTotalCount(0);
      }
    })();
  }, [auth]);

  const getClass = (value: HeatmapValue | null) => {
    if (!value || value.count === 0) return styles.colorEmpty;
    if (value.count >= 10) return styles.colorScale4;
    if (value.count >= 5) return styles.colorScale3;
    if (value.count >= 2) return styles.colorScale2;
    return styles.colorScale1;
  };

  const getTooltip = (value: HeatmapValue | null): Record<string, string> => {
    const base = { "data-tooltip-id": "heatmap-tooltip" };
    if (!value?.date) return { ...base, "data-tooltip-content": "No episodes watched" };
    const d = new Date(value.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { ...base, "data-tooltip-content": `Watched ${value.count} episode${value.count !== 1 ? "s" : ""} on ${d}` };
  };

  return (
    <>
      <p className="text-lg font-bold mb-4">Watched {totalCount} episodes in the last year</p>
      <CalendarHeatmap
        weekdayLabels={["", "M", "", "W", "", "F", ""]}
        showWeekdayLabels
        showOutOfRangeDays
        startDate={startDate}
        endDate={endDate}
        classForValue={(v) => getClass(v as unknown as HeatmapValue)}
        values={heatmapData}
        gutterSize={2}
        tooltipDataAttrs={(v) => getTooltip(v as HeatmapValue)}
      />
      <Tooltip id="heatmap-tooltip" />
    </>
  );
}

export default AnimeHeatmap;
