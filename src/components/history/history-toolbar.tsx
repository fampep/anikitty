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
    <div className="sticky top-[calc(var(--nav-total-height)+0.35rem)] z-20 mb-6 space-y-3 rounded-2xl border border-border/60 bg-background/[0.88] p-3 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#090909]/[0.88]">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t("history.modes.label")}
          className="flex flex-wrap gap-1.5"
        >
          {MODES.map(({ id, icon: Icon }, i) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewMode(id)}
                style={{ ["--history-index" as string]: i }}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
                  active
                    ? "border-transparent bg-white text-black"
                    : "border-border/60 bg-card/70 text-foreground hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/82 dark:hover:border-white/20",
                )}
              >
                {active ? (
                  <Icon className="h-3.5 w-3.5" />
                ) : (
                  <span className="history-pill__dot" aria-hidden />
                )}
                <span className="hidden sm:inline">{t(`history.modes.${id}`)}</span>
                <Icon className="h-3.5 w-3.5 sm:hidden" />
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[10rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-white/35"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilters({ search: e.target.value })}
            placeholder={t("history.searchPlaceholder")}
            className="site-input h-9 w-full pl-9 pr-3 text-sm"
            aria-label={t("history.searchPlaceholder")}
          />
        </div>

        <div className="relative">
          <select
            className="h-9 appearance-none rounded-full border border-border/60 bg-card/70 px-3 pr-8 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/82 dark:hover:border-white/20"
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
          <Download className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground dark:text-white/40" />
        </div>

        {refreshing ? (
          <span className="font-mono text-[10px] text-muted-foreground dark:text-white/30">
            {t("history.refreshing")}
          </span>
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
              className="site-input h-8 rounded-full px-3 text-[11px]"
              aria-label={t("history.group.from")}
            />
            <input
              type="date"
              value={filters.customTo ?? ""}
              onChange={(e) => onFilters({ customTo: e.target.value || null })}
              className="site-input h-8 rounded-full px-3 text-[11px]"
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
    <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 text-[10px] text-muted-foreground transition-colors hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/40 dark:hover:border-white/20">
      <span className="hidden whitespace-nowrap md:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9rem] bg-transparent text-[11px] font-medium text-foreground outline-none dark:text-white/75"
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
