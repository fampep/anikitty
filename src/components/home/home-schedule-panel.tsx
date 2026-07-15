"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useI18n, useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { HomeSectionLink } from "./home-shared";

type ScheduleItem = {
  id: string;
  name: string;
  episode: number;
  airingTimestamp: number;
  secondsUntilAiring: number;
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function HomeSchedulePanel() {
  const t = useT();
  const { locale } = useI18n();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  const days = useMemo(() => {
    const list: Date[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/schedule?date=${selectedDay}`)
      .then((r) => r.json())
      .then((d) => setItems(d.data?.scheduledAnimes ?? []))
      .catch(() => {
        setItems([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [selectedDay, retry]);

  const todayKey = dayKey(new Date());

  const listProgress = useMemo(() => {
    if (!items.length) return 0;
    const aired = items.filter((item) => item.secondsUntilAiring <= 0).length;
    return Math.round((aired / items.length) * 100);
  }, [items]);

  return (
    <div className="flex flex-col w-full gap-3 overflow-hidden">
      <HomeSectionLink href={ROUTES.SCHEDULE} title={t("home.estimatedSchedule")} compact />

      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-momentum py-1">
        {days.map((d, index) => {
          const key = dayKey(d);
          const active = key === selectedDay;
          const isToday = key === todayKey;
          return (
            <div key={key} className="flex items-center gap-1 shrink-0">
              {index > 0 ? (
                <span className="text-muted-foreground/40 dark:text-white/15 px-0.5 select-none" aria-hidden>
                  /
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedDay(key)}
                className={cn(
                  "flex flex-col items-center min-w-[2.75rem] px-1 py-1 rounded-lg transition-colors",
                  active
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70",
                )}
              >
                <span className={cn("text-xs font-bold", active && "text-violet-300")}>
                  {d.toLocaleDateString(locale, { weekday: "short" })}
                </span>
                {active || isToday ? (
                  <span className="text-[10px] font-medium mt-0.5 tabular-nums opacity-70">
                    {d.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="home-schedule-list relative flex flex-col w-full gap-0.5 rounded-xl overflow-hidden"
        style={{ "--schedule-progress": `${listProgress}%` } as CSSProperties}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))
        ) : error ? (
          <div className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-muted-foreground">
            <span>{t("home.scheduleLoadError")}</span>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("home.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">{t("home.noScheduleToday")}</p>
        ) : (
          <>
            {items.slice(0, 6).map((item) => {
              const aired = item.secondsUntilAiring <= 0;
              return (
                <Link
                  key={`${item.id}-${item.episode}`}
                  href={`${ROUTES.WATCH}?anime=${item.id}`}
                  className={cn(
                    "home-schedule-row flex items-center gap-3 w-full px-2 py-2 rounded-lg transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.06]",
                    aired && "opacity-70 hover:opacity-100",
                  )}
                >
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground dark:text-white/45 w-11 tabular-nums">
                    {formatTime(item.airingTimestamp)}
                  </span>
                  <span className="text-sm line-clamp-1 grow font-medium min-w-0">{item.name}</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground dark:text-white/45 tabular-nums">
                    {t("common.ep")} {item.episode}
                  </span>
                </Link>
              );
            })}
            <Link
              href={ROUTES.SCHEDULE}
              className="mt-1 px-2 py-2 text-xs font-semibold text-violet-300/80 hover:text-violet-200 transition-colors"
            >
              {t("common.viewAll")} →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
