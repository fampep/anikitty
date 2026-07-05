"use client";

import React, { useEffect, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import styles from "./heatmap.module.css";
import { Tooltip } from "react-tooltip";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { Activity } from "lucide-react";

type HeatmapValue = {
  date: string;
  count: number;
};

type Props = {
  username: string;
};

function AnimeHeatmap({ username }: Props) {
  const t = useT();
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/activity`,
          withAuth(),
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setHeatmapData(data.activity ?? []);
        setTotalCount(data.totalCount ?? 0);
        setFailed(false);
      } catch {
        setHeatmapData([]);
        setTotalCount(0);
        setFailed(true);
      }
    })();
  }, [username]);

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

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Activity className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
        <div>
          <p className="text-sm text-muted-foreground dark:text-white/50 font-medium">{t("profile.failedToLoadActivity")}</p>
          <button
            onClick={async () => {
              setRetrying(true);
              try {
                const res = await fetch(
                  `/api/users/${encodeURIComponent(username)}/activity`,
                  withAuth(),
                );
                if (!res.ok) throw new Error("failed");
                const data = await res.json();
                setHeatmapData(data.activity ?? []);
                setTotalCount(data.totalCount ?? 0);
                setFailed(false);
              } catch {
                setFailed(true);
              } finally {
                setRetrying(false);
              }
            }}
            disabled={retrying}
            className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors mt-1"
          >
            {retrying ? t("profile.retrying") : t("profile.retry")}
          </button>
        </div>
      </div>
    );
  }

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
