"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import { useHistoryDashboard } from "@/hooks/use-history-dashboard";
import HistoryToolbar from "@/components/history/history-toolbar";
import {
  HistoryContinueSection,
  HistoryFinishedSection,
  HistoryRecentlyAddedSection,
} from "@/components/history/history-rails";
import {
  HistoryCalendarView,
  HistoryGridView,
  HistoryTimelineView,
} from "@/components/history/history-views";
import HistoryStatisticsView from "@/components/history/history-statistics";
import HistoryEmptyState from "@/components/history/history-empty";
import HistoryCard from "@/components/history/history-card";
import {
  downloadBlob,
  exportAniListCompatible,
  exportHistoryCsv,
  exportHistoryJson,
  exportMalCompatibleCsv,
} from "@/lib/history/export";
import { toast } from "sonner";

export default function WatchHistoryContent() {
  const t = useT();
  const dash = useHistoryDashboard();
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") dash.setViewMode("timeline");
      if (e.key === "2") dash.setViewMode("grid");
      if (e.key === "3") dash.setViewMode("calendar");
      if (e.key === "4") dash.setViewMode("statistics");
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[type="search"][aria-label]',
        );
        input?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dash]);

  const handleExport = useCallback(
    (format: "json" | "csv" | "anilist" | "mal") => {
      try {
        const stamp = new Date().toISOString().slice(0, 10);
        if (format === "json") {
          downloadBlob(
            exportHistoryJson({
              exportedAt: new Date().toISOString(),
              version: 1,
              aggregates: dash.aggregates,
              episodes: dash.episodes,
              sessions: dash.sessions,
            }),
            `anikitty-history-${stamp}.json`,
          );
        } else if (format === "csv") {
          downloadBlob(exportHistoryCsv(dash.aggregates), `anikitty-history-${stamp}.csv`);
        } else if (format === "anilist") {
          downloadBlob(
            exportAniListCompatible(dash.aggregates),
            `anikitty-anilist-${stamp}.json`,
          );
        } else {
          downloadBlob(exportMalCompatibleCsv(dash.aggregates), `anikitty-mal-${stamp}.csv`);
        }
        toast.success(t("history.export.done"));
      } catch {
        toast.error(t("history.export.failed"));
      }
    },
    [dash.aggregates, dash.episodes, dash.sessions, t],
  );

  const calendarItems = useMemo(() => {
    if (!calendarDate) return [];
    return dash.filtered.filter((a) => {
      const iso = a.lastWatched ?? a.addedAt;
      if (!iso) return false;
      return iso.slice(0, 10) === calendarDate;
    });
  }, [calendarDate, dash.filtered]);

  return (
    <div className="relative min-h-screen overflow-hidden pb-28 pt-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_55%),radial-gradient(ellipse_at_80%_0%,rgba(16,185,129,0.06),transparent_45%)]"
      />

      <Container className="relative max-w-6xl">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <History className="h-5 w-5 text-sky-300/90" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white md:text-3xl">
                {t("history.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground dark:text-white/40">
                {t("history.subtitle")}
              </p>
            </div>
          </div>
        </header>

        {!dash.auth ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-r from-white/[0.03] to-sky-500/[0.04] px-5 py-6 dark:border-white/8 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <History className="h-5 w-5 shrink-0 text-muted-foreground/70 dark:text-white/25" />
              <p className="text-sm text-muted-foreground dark:text-white/45">
                {t("history.signIn")}
              </p>
            </div>
            <LoginPopoverButton />
          </div>
        ) : dash.loading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-xl border border-white/6 bg-white/[0.03]"
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-xl border border-white/6 bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        ) : dash.error ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-400/20 bg-rose-500/5 px-6 py-12 text-center">
            <p className="text-sm text-rose-200/80">{t("history.loadError")}</p>
            <button
              type="button"
              onClick={() => void dash.reload()}
              className="site-ghost-btn h-8 rounded-lg px-3 text-xs font-semibold"
            >
              {t("history.retry")}
            </button>
          </div>
        ) : dash.isEmpty ? (
          <HistoryEmptyState />
        ) : (
          <>
            <HistoryToolbar
              viewMode={dash.viewMode}
              onViewMode={dash.setViewMode}
              filters={dash.filters}
              onFilters={dash.updateFilters}
              onExport={handleExport}
              refreshing={dash.refreshing}
            />

            {dash.viewMode !== "statistics" ? (
              <>
                <HistoryContinueSection items={dash.continueItems} />
                <HistoryFinishedSection items={dash.finishedItems} />
                <HistoryRecentlyAddedSection
                  items={dash.recentlyAdded}
                  viewed={dash.recentlyViewed}
                />
              </>
            ) : null}

            {dash.viewMode === "timeline" ? (
              <HistoryTimelineView
                items={dash.visibleItems}
                allFilteredCount={dash.filtered.length}
                groupBy={dash.filters.groupBy}
                hasMore={dash.hasMore}
                onLoadMore={dash.loadMore}
                onNoteSave={dash.saveNote}
                sessions={dash.sessions}
              />
            ) : null}

            {dash.viewMode === "grid" ? (
              <HistoryGridView
                items={dash.visibleItems}
                allFilteredCount={dash.filtered.length}
                hasMore={dash.hasMore}
                onLoadMore={dash.loadMore}
                onNoteSave={dash.saveNote}
              />
            ) : null}

            {dash.viewMode === "calendar" ? (
              <div className="space-y-4">
                <HistoryCalendarView
                  activity={dash.stats.activityByDay}
                  selectedDate={calendarDate}
                  onSelectDate={(d) => {
                    setCalendarDate(d);
                    if (d) {
                      dash.updateFilters({
                        groupBy: "custom",
                        customFrom: d,
                        customTo: d,
                      });
                    } else {
                      dash.updateFilters({
                        groupBy: "auto",
                        customFrom: null,
                        customTo: null,
                      });
                    }
                  }}
                />
                {calendarDate ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-white/45">
                      {t("history.calendar.forDate", { date: calendarDate })}
                    </h3>
                    {calendarItems.length === 0 ? (
                      <p className="text-xs text-white/30">{t("history.calendar.noItems")}</p>
                    ) : (
                      calendarItems.map((item) => (
                        <HistoryCard
                          key={item.animeId}
                          item={item}
                          onNoteSave={dash.saveNote}
                        />
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {dash.viewMode === "statistics" ? (
              <HistoryStatisticsView
                stats={dash.stats}
                streaks={dash.streaks}
                milestones={dash.milestones}
              />
            ) : null}

            {dash.refreshing ? (
              <div className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] text-white/60 backdrop-blur-md">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("history.refreshing")}
              </div>
            ) : null}
          </>
        )}
      </Container>
    </div>
  );
}
