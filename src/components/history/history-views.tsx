"use client";

import { useMemo } from "react";
import HistoryCard from "@/components/history/history-card";
import { groupTimelineItems } from "@/lib/history/derive";
import type { AnimeAggregate, HistoryGroupBy } from "@/lib/history/types";
import { useInfiniteSentinel, useVirtualWindow } from "@/hooks/use-virtual-window";
import { useT } from "@/providers/i18n-provider";
import type { WatchSession } from "@/lib/history/types";
import { formatWatchTime, relativeTime } from "@/lib/history/derive";
import { Film } from "lucide-react";

type Props = {
  items: AnimeAggregate[];
  allFilteredCount: number;
  groupBy: HistoryGroupBy;
  hasMore: boolean;
  onLoadMore: () => void;
  onNoteSave: (animeId: string, note: string) => void;
  sessions?: WatchSession[];
  showSessions?: boolean;
};

export function HistoryTimelineView({
  items,
  allFilteredCount,
  groupBy,
  hasMore,
  onLoadMore,
  onNoteSave,
  sessions = [],
  showSessions = true,
}: Props) {
  const t = useT();
  const groups = useMemo(() => groupTimelineItems(items, groupBy), [items, groupBy]);
  const flat = useMemo(() => {
    const rows: { type: "header" | "item"; label?: string; item?: AnimeAggregate }[] = [];
    for (const g of groups) {
      if (g.label) rows.push({ type: "header", label: g.label });
      for (const item of g.items) rows.push({ type: "item", item });
    }
    return rows;
  }, [groups]);

  const useVirt = flat.length > 40;
  const { parentRef, virtualItems, totalHeight, offsetTop } = useVirtualWindow(flat, {
    estimateSize: 96,
    enabled: useVirt,
  });
  const sentinelRef = useInfiniteSentinel(onLoadMore, hasMore);

  return (
    <div>
      {showSessions && sessions.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">
            {t("history.sessions.title")}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {sessions.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="site-panel w-52 shrink-0 rounded-xl p-2.5"
              >
                <p className="truncate text-[12px] font-semibold text-white/85">{s.title}</p>
                <p className="mt-1 font-mono text-[10px] text-white/35">
                  {t("history.sessions.eps", { n: s.episodeCount })} ·{" "}
                  {formatWatchTime(s.durationSeconds)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-white/25">
                  {relativeTime(s.endAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/35">
          {t("history.emptyFiltered")}
        </p>
      ) : useVirt ? (
        <div ref={parentRef} style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetTop}px)` }} className="space-y-2">
            {virtualItems.map(({ item: row, index }) =>
              row.type === "header" ? (
                <h3
                  key={`h-${row.label}-${index}`}
                  className="sticky top-[8.5rem] z-10 bg-background/80 py-2 text-xs font-bold uppercase tracking-wide text-white/45 backdrop-blur-sm dark:bg-[#0a0a0a]/80"
                >
                  {row.label}
                </h3>
              ) : row.item ? (
                <HistoryCard
                  key={row.item.animeId}
                  item={row.item}
                  onNoteSave={onNoteSave}
                />
              ) : null,
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label || "all"}>
              {g.label ? (
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/45">
                  {g.label}
                </h3>
              ) : null}
              <div className="space-y-2">
                {g.items.map((item) => (
                  <HistoryCard key={item.animeId} item={item} onNoteSave={onNoteSave} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-8" />
      {hasMore ? (
        <p className="py-2 text-center font-mono text-[10px] text-white/30">
          {t("history.showing", { shown: items.length, total: allFilteredCount })}
        </p>
      ) : items.length > 0 ? (
        <p className="py-2 text-center font-mono text-[10px] text-white/25">
          {t("history.endOfList", { n: allFilteredCount })}
        </p>
      ) : null}
    </div>
  );
}

export function HistoryGridView({
  items,
  allFilteredCount,
  hasMore,
  onLoadMore,
  onNoteSave,
}: {
  items: AnimeAggregate[];
  allFilteredCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onNoteSave: (animeId: string, note: string) => void;
}) {
  const t = useT();
  const sentinelRef = useInfiniteSentinel(onLoadMore, hasMore);

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/35">
        {t("history.emptyFiltered")}
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <HistoryCard key={item.animeId} item={item} variant="grid" onNoteSave={onNoteSave} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {hasMore ? (
        <p className="py-2 text-center font-mono text-[10px] text-white/30">
          {t("history.showing", { shown: items.length, total: allFilteredCount })}
        </p>
      ) : null}
    </div>
  );
}

export function HistoryCalendarView({
  activity,
  onSelectDate,
  selectedDate,
}: {
  activity: { date: string; episodes: number; minutes: number }[];
  onSelectDate: (date: string | null) => void;
  selectedDate: string | null;
}) {
  const t = useT();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const map = new Map(activity.map((a) => [a.date, a]));

  const cells: (null | number)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="site-panel rounded-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/85">{monthLabel}</h3>
        {selectedDate ? (
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-[11px] text-sky-300/80 hover:text-sky-200"
          >
            {t("history.calendar.clear")}
          </button>
        ) : null}
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-white/30">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`pad-${i}`} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const act = map.get(key);
          const intensity = act
            ? act.episodes >= 10
              ? "bg-emerald-400/80"
              : act.episodes >= 5
                ? "bg-sky-400/70"
                : act.episodes >= 2
                  ? "bg-sky-400/40"
                  : "bg-sky-400/20"
            : "bg-white/[0.03]";
          const selected = selectedDate === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(selected ? null : key)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px] transition-colors ${
                selected
                  ? "border-sky-400/50 ring-1 ring-sky-400/30"
                  : "border-transparent hover:border-white/10"
              } ${intensity}`}
              title={
                act
                  ? t("history.calendar.dayTip", {
                      n: act.episodes,
                      m: act.minutes,
                    })
                  : undefined
              }
            >
              <span className="font-mono text-white/70">{day}</span>
              {act ? (
                <span className="font-mono text-[8px] text-white/50">{act.episodes}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/30">
        <Film className="h-3 w-3" />
        {t("history.calendar.hint")}
      </p>
    </div>
  );
}
