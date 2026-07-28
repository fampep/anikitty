"use client";

import {
  CalendarDays,
  Download,
  Grid3X3,
  LayoutList,
  Search,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type {
  HistoryFilters,
  HistoryGroupBy,
  HistorySortKey,
  HistoryViewMode,
  MediaTypeFilter,
  AiringStatusFilter,
  WatchStatusFilter,
} from "@/lib/history/types";

const MODES: { id: HistoryViewMode; icon: typeof LayoutList }[] = [
  { id: "timeline", icon: LayoutList },
  { id: "grid", icon: Grid3X3 },
  { id: "calendar", icon: CalendarDays },
  { id: "statistics", icon: BarChart3 },
];

type Props = {
  viewMode: HistoryViewMode;
  onViewMode: (m: HistoryViewMode) => void;
  filters: HistoryFilters;
  onFilters: (patch: Partial<HistoryFilters>) => void;
  onExport: (format: "json" | "csv" | "anilist" | "mal") => void;
  refreshing?: boolean;
};

export default function HistoryToolbar({
  viewMode,
  onViewMode,
  filters,
  onFilters,
  onExport,
  refreshing,
}: Props) {
  const t = useT();

  return (
    <div className="site-glass sticky top-16 z-20 mb-6 space-y-3 rounded-2xl border border-border p-3 shadow-sm shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/90">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t("history.modes.label")}
          className="flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1"
        >
          {MODES.map(({ id, icon: Icon }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewMode(id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-white/12 text-white/90 ring-1 ring-white/10"
                    : "text-white/45 hover:bg-white/6 hover:text-white/80",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t(`history.modes.${id}`)}</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilters({ search: e.target.value })}
            placeholder={t("history.searchPlaceholder")}
            className="h-8 w-full rounded-lg border border-white/10 bg-black/25 pl-8 pr-3 text-xs text-white/85 outline-none placeholder:text-white/30 focus:border-sky-500/40"
            aria-label={t("history.searchPlaceholder")}
          />
        </div>

        <div className="relative">
          <select
            className="site-ghost-btn h-8 appearance-none rounded-lg px-2.5 pr-7 text-[11px] font-semibold outline-none"
            value=""
            onChange={(e) => {
              const v = e.target.value as "json" | "csv" | "anilist" | "mal";
              if (v) onExport(v);
              e.target.value = "";
            }}
            aria-label={t("history.export.label")}
          >
            <option value="">{t("history.export.label")}</option>
            <option value="json">{t("history.export.json")}</option>
            <option value="csv">{t("history.export.csv")}</option>
            <option value="anilist">{t("history.export.anilist")}</option>
            <option value="mal">{t("history.export.mal")}</option>
          </select>
          <Download className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
        </div>

        {refreshing ? (
          <span className="font-mono text-[10px] text-white/30">{t("history.refreshing")}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterSelect
          label={t("history.filters.watchStatus")}
          value={filters.watchStatus}
          onChange={(v) => onFilters({ watchStatus: v as WatchStatusFilter })}
          options={[
            ["all", t("history.filters.all")],
            ["watching", t("profile.stats.watching")],
            ["completed", t("profile.stats.completed")],
            ["on hold", t("profile.stats.onHold")],
            ["dropped", t("profile.stats.dropped")],
            ["plan to watch", t("profile.stats.planToWatch")],
            ["rewatching", t("history.filters.rewatching")],
          ]}
        />
        <FilterSelect
          label={t("history.filters.mediaType")}
          value={filters.mediaType}
          onChange={(v) => onFilters({ mediaType: v as MediaTypeFilter })}
          options={[
            ["all", t("history.filters.all")],
            ["TV", "TV"],
            ["Movie", "Movie"],
            ["OVA", "OVA"],
            ["ONA", "ONA"],
            ["Special", "Special"],
            ["Music", "Music"],
          ]}
        />
        <FilterSelect
          label={t("history.filters.airing")}
          value={filters.airingStatus}
          onChange={(v) => onFilters({ airingStatus: v as AiringStatusFilter })}
          options={[
            ["all", t("history.filters.all")],
            ["airing", t("history.filters.airing")],
            ["finished", t("history.filters.finishedAiring")],
            ["upcoming", t("history.filters.upcoming")],
          ]}
        />
        <FilterSelect
          label={t("history.filters.groupBy")}
          value={filters.groupBy}
          onChange={(v) => onFilters({ groupBy: v as HistoryGroupBy })}
          options={[
            ["auto", t("history.group.auto")],
            ["today", t("history.group.today")],
            ["yesterday", t("history.group.yesterday")],
            ["thisWeek", t("history.group.thisWeek")],
            ["lastWeek", t("history.group.lastWeek")],
            ["thisMonth", t("history.group.thisMonth")],
            ["lastMonth", t("history.group.lastMonth")],
            ["year", t("history.group.year")],
            ["custom", t("history.group.custom")],
          ]}
        />
        <FilterSelect
          label={t("history.filters.sort")}
          value={filters.sort}
          onChange={(v) => onFilters({ sort: v as HistorySortKey })}
          options={[
            ["recent", t("history.sort.recent")],
            ["oldest", t("history.sort.oldest")],
            ["title", t("history.sort.title")],
            ["rating", t("history.sort.rating")],
            ["release", t("history.sort.release")],
            ["updated", t("history.sort.updated")],
            ["duration", t("history.sort.duration")],
          ]}
        />
        {filters.groupBy === "custom" ? (
          <>
            <input
              type="date"
              value={filters.customFrom ?? ""}
              onChange={(e) => onFilters({ customFrom: e.target.value || null })}
              className="h-8 rounded-lg border border-white/10 bg-black/25 px-2 text-[11px] text-white/70 outline-none"
              aria-label={t("history.group.from")}
            />
            <input
              type="date"
              value={filters.customTo ?? ""}
              onChange={(e) => onFilters({ customTo: e.target.value || null })}
              className="h-8 rounded-lg border border-white/10 bg-black/25 px-2 text-[11px] text-white/70 outline-none"
              aria-label={t("history.group.to")}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 text-[10px] text-white/40">
      <span className="hidden whitespace-nowrap md:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9rem] bg-transparent text-[11px] font-semibold text-white/70 outline-none"
        aria-label={label}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
