"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useI18n, useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { HomeScrollRail, HomeSectionLink } from "./home-shared";

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
    start.setDate(start.getDate() - 7);
    for (let i = 0; i < 15; i++) {
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

  return (
    <div className="flex flex-col w-full gap-4 overflow-hidden">
      <HomeSectionLink href={ROUTES.SCHEDULE} title={t("home.estimatedSchedule")} />

      <HomeScrollRail className="rounded-xl" edgeFade>
        {days.map((d) => {
          const key = dayKey(d);
          const active = key === selectedDay;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              data-today={isToday ? "true" : undefined}
              onClick={() => setSelectedDay(key)}
              className={cn(
                "w-20 py-2 flex flex-col items-center justify-center shrink-0 rounded-xl ring-inset transition-all",
                active
                  ? "bg-foreground text-background font-bold dark:bg-white dark:text-black"
                  : "home-glass-pill font-bold text-foreground/90",
              )}
            >
              <span>{d.toLocaleDateString(locale, { weekday: "short" })}</span>
              <span
                className={cn(
                  "font-semibold text-xs mt-0.5",
                  active ? "text-background/80 dark:text-black/70" : "text-muted-foreground",
                )}
              >
                {d.toLocaleDateString(locale, { month: "short", day: "numeric" })}
              </span>
            </button>
          );
        })}
      </HomeScrollRail>

      <div className="flex flex-col w-full gap-2 home-glass-panel rounded-xl p-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))
        ) : error ? (
          <div className="flex items-center justify-between gap-3 px-3 py-3 text-xs text-muted-foreground">
            <span>{t("home.scheduleLoadError")}</span>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg home-glass-pill text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("home.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">{t("home.noScheduleToday")}</p>
        ) : (
          items.slice(0, 10).map((item) => {
            const aired = item.secondsUntilAiring <= 0;
            return (
              <Link
                key={`${item.id}-${item.episode}`}
                href={`${ROUTES.WATCH}?anime=${item.id}`}
                className={cn(
                  "flex items-center h-10 gap-3 w-full hover:bg-white/10 dark:hover:bg-white/10 p-1 px-2 rounded-xl transition-colors",
                  aired && "opacity-75 hover:opacity-100",
                )}
              >
                <div className="shrink-0 text-xs font-semibold text-muted-foreground w-11 tabular-nums">
                  {formatTime(item.airingTimestamp)}
                </div>
                <div className="flex items-center gap-3 w-full min-w-0">
                  <span className="text-sm line-clamp-1 grow font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs min-w-[4.5rem] text-center font-semibold px-2 py-1 rounded-lg bg-white/10">
                    {t("home.episode", { n: item.episode })}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
