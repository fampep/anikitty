"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  PauseCircle,
  Play,
  RotateCcw,
  TvMinimalPlay,
  type LucideIcon,
} from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { anisurgeContinue, anisurgeWatchlist, statusToFolder } from "@/lib/oauth/anisurge";
import useBookMarks, { type Bookmark, type WatchHistory } from "@/hooks/use-get-bookmark";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const PAGE_SIZE = 24;
const LIST_PAGE_SIZE = 24;

type ListStatus =
  | "watching"
  | "plan to watch"
  | "on hold"
  | "completed"
  | "dropped";

type HistoryItem = {
  animeId: string;
  episodeId: string;
  episodeNumber: number | null;
  currentTime: number;
  duration: number;
  language: string;
  lastUpdated: string | null;
  anime: {
    title?: { english?: string | null; romaji?: string | null };
    cover_image?: { large?: string | null; extra_large?: string | null };
  } | null;
};

type FolderCounts = Record<"watching" | "plan" | "onHold" | "completed" | "dropped", number>;

const STATUS_TABS: {
  value: ListStatus;
  countKey: keyof FolderCounts;
  icon: LucideIcon;
  accent: string;
  active: string;
}[] = [
  {
    value: "watching",
    countKey: "watching",
    icon: TvMinimalPlay,
    accent: "text-sky-400",
    active: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  },
  {
    value: "plan to watch",
    countKey: "plan",
    icon: BookOpen,
    accent: "text-zinc-400",
    active: "border-white/20 bg-white/[0.08] text-white/90",
  },
  {
    value: "on hold",
    countKey: "onHold",
    icon: PauseCircle,
    accent: "text-amber-400",
    active: "border-amber-500/35 bg-amber-500/12 text-amber-200",
  },
  {
    value: "completed",
    countKey: "completed",
    icon: CheckCircle2,
    accent: "text-emerald-400",
    active: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  },
  {
    value: "dropped",
    countKey: "dropped",
    icon: Ban,
    accent: "text-rose-400",
    active: "border-rose-500/35 bg-rose-500/12 text-rose-200",
  },
];

const EMPTY_COUNTS: FolderCounts = {
  watching: 0,
  plan: 0,
  onHold: 0,
  completed: 0,
  dropped: 0,
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function pct(current: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((current / duration) * 100));
}

function readListFromUrl(): ListStatus {
  if (typeof window === "undefined") return "watching";
  const raw = new URLSearchParams(window.location.search).get("list");
  const match = STATUS_TABS.find((t) => t.value === raw);
  return match?.value ?? "watching";
}

function episodeProgressPct(h: WatchHistory | null | undefined): number {
  if (!h) return 0;
  const duration = h.duration ?? h.timestamp ?? 0;
  return pct(h.current, duration);
}

export default function WatchHistoryContent() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const bumpWatchlist = useWatchlistStore((s) => s.bump);
  const bookmarkLabels = useBookmarkLabels();

  const [listStatus, setListStatus] = useState<ListStatus>("watching");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<FolderCounts>(EMPTY_COUNTS);
  const [progressMap, setProgressMap] = useState<Record<string, WatchHistory>>({});
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  useEffect(() => {
    setListStatus(readListFromUrl());
  }, []);

  const { bookmarks, createOrUpdateBookMark, totalPages, isLoading } = useBookMarks({
    status: listStatus,
    page,
    per_page: LIST_PAGE_SIZE,
    populate: Boolean(auth),
  });

  const selectList = useCallback((value: ListStatus) => {
    setListStatus(value);
    setPage(1);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "watching") url.searchParams.delete("list");
    else url.searchParams.set("list", value);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const loadCounts = useCallback(async () => {
    if (!auth) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    try {
      const pairs = await Promise.all(
        STATUS_TABS.map(async (tab) => {
          const folder = statusToFolder(tab.value);
          const res = await anisurgeWatchlist.get(folder, 1, 0);
          return [tab.countKey, Number(res?.total ?? 0)] as const;
        }),
      );
      const next = { ...EMPTY_COUNTS };
      for (const [key, total] of pairs) next[key] = total;
      setCounts(next);
    } catch {
      /* keep previous counts */
    }
  }, [auth]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts, watchlistVersion]);

  useEffect(() => {
    if (!auth) {
      setProgressMap({});
      return;
    }
    anisurgeContinue
      .get(true, 100)
      .then((res: { data?: Array<Record<string, unknown>> }) => {
        const data = res?.data ?? [];
        const map: Record<string, WatchHistory> = {};
        for (const r of data) {
          const animeId = String(r.animeId ?? "");
          if (!animeId) continue;
          const episodeId = String(r.episodeId ?? "");
          const episodeNumber =
            parseInt(episodeId.replace("ep-", ""), 10) ||
            Number(r.episodeNumber) ||
            0;
          map[animeId] = {
            id: animeId,
            current: Number(r.currentTime ?? 0),
            duration: Number(r.duration ?? 0),
            timestamp: Number(r.duration ?? 0),
            episodeId,
            episodeNumber,
            created: String(r.lastUpdated ?? ""),
          };
        }
        setProgressMap(map);
      })
      .catch(() => setProgressMap({}));
  }, [auth, watchlistVersion]);

  const loadRecent = useCallback(async () => {
    if (!auth || listStatus !== "watching") {
      setRecent([]);
      return;
    }
    setRecentLoading(true);
    try {
      const res = await fetch(
        `/api/account/watch/continue?latestPerAnime=false&limit=${PAGE_SIZE}&offset=0`,
        withAuth(),
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecent(data.data ?? []);
    } catch {
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, [auth, listStatus]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent, watchlistVersion]);

  const tabLabel = useCallback(
    (value: ListStatus) => {
      const key =
        value === "plan to watch"
          ? "planToWatch"
          : value === "on hold"
            ? "onHold"
            : value;
      return t(`profile.stats.${key}`);
    },
    [t],
  );

  const emptyCopy = useMemo(() => {
    switch (listStatus) {
      case "completed":
        return t("history.emptyCompleted");
      case "plan to watch":
        return t("history.emptyPlan");
      case "on hold":
        return t("history.emptyOnHold");
      case "dropped":
        return t("history.emptyDropped");
      default:
        return t("history.emptyWatching");
    }
  }, [listStatus, t]);

  const changeStatus = async (bookmark: Bookmark, nextStatus: string) => {
    if (nextStatus === bookmark.status) return;
    setStatusBusyId(bookmark.animeId);
    try {
      await createOrUpdateBookMark(
        bookmark.animeId,
        bookmark.animeTitle,
        bookmark.thumbnail,
        nextStatus,
        true,
      );
      bumpWatchlist();
      // Leaving the current folder — drop from this view immediately.
      if (nextStatus !== listStatus) {
        /* useBookMarks refetches via watchlistVersion bump */
      }
    } finally {
      setStatusBusyId(null);
    }
  };

  const historyTitle = (it: HistoryItem) =>
    it.anime?.title?.english || it.anime?.title?.romaji || it.animeId;

  return (
    <div className="relative min-h-screen overflow-hidden pb-28 pt-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_55%),radial-gradient(ellipse_at_80%_0%,rgba(16,185,129,0.06),transparent_45%)]"
      />

      <Container className="relative max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <History className="h-5 w-5 text-sky-300/90" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white md:text-3xl">
                {t("history.title")}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground dark:text-white/40">
                {t("history.subtitle")}
              </p>
            </div>
          </div>
        </header>

        {!auth ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-gradient-to-r from-white/[0.03] to-sky-500/[0.04] px-5 py-6 dark:border-white/8 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <History className="h-5 w-5 shrink-0 text-muted-foreground/70 dark:text-white/25" />
              <p className="text-sm text-muted-foreground dark:text-white/45">{t("history.signIn")}</p>
            </div>
            <LoginPopoverButton />
          </div>
        ) : (
          <>
            {/* Compact status sub-nav — settings-style chips */}
            <nav
              aria-label={t("history.listNav")}
              className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-muted/30 p-1.5 dark:border-white/[0.08] dark:bg-white/[0.025]"
            >
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = listStatus === tab.value;
                const count = counts[tab.countKey];
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => selectList(tab.value)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition-colors sm:px-3",
                      active
                        ? tab.active
                        : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground/85 dark:text-white/45 dark:hover:text-white/80",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active ? tab.accent : "opacity-70")} />
                    <span className="truncate">{tabLabel(tab.value)}</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                        active ? "bg-black/25 text-inherit" : "bg-white/[0.05] text-white/35",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            <section className="mb-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold tracking-wide text-foreground/90 dark:text-white/85">
                    {tabLabel(listStatus)}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-mono text-muted-foreground dark:text-white/30">
                    {listStatus === "completed"
                      ? t("history.completedHint")
                      : listStatus === "watching"
                        ? t("history.watchingHint")
                        : t("history.sectionHint")}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] animate-pulse rounded-xl border border-border bg-muted/40 dark:border-white/6 dark:bg-white/[0.03]"
                    />
                  ))}
                </div>
              ) : !bookmarks?.length ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center dark:border-white/[0.08] dark:bg-white/[0.015]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50 dark:border-white/[0.08] dark:bg-white/[0.04]">
                    <Clock className="h-6 w-6 text-muted-foreground/70 dark:text-white/20" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground dark:text-white/35">{emptyCopy}</p>
                  <Link
                    href={ROUTES.TRENDING}
                    className="text-xs text-sky-300/80 transition-colors hover:text-sky-200"
                  >
                    {t("history.emptyCta")}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {bookmarks.map((bookmark) => {
                      const progress = progressMap[bookmark.animeId] ?? null;
                      const progressPct = episodeProgressPct(progress);
                      const href = progress?.episodeId
                        ? `${ROUTES.WATCH}?anime=${encodeURIComponent(bookmark.animeId)}&episode=${encodeURIComponent(progress.episodeId)}`
                        : `${ROUTES.ANIME_DETAILS}/${encodeURIComponent(bookmark.animeId)}`;
                      const busy = statusBusyId === bookmark.animeId;

                      return (
                        <article
                          key={bookmark.animeId}
                          className="group relative overflow-hidden rounded-xl border border-border bg-muted/25 transition-colors hover:border-white/14 hover:bg-muted/40 dark:border-white/[0.07] dark:bg-white/[0.025]"
                        >
                          <Link href={href} className="block">
                            <div className="relative aspect-[2/3] overflow-hidden bg-black/40">
                              {bookmark.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={bookmark.thumbnail}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-white/20">
                                  <TvMinimalPlay className="h-8 w-8" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                              {listStatus === "watching" && progressPct > 0 ? (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                                  <div
                                    className="h-full bg-sky-400"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              ) : null}
                              {listStatus === "completed" ? (
                                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200 backdrop-blur-sm">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  {t("history.finished")}
                                </span>
                              ) : null}
                              {progress?.episodeNumber ? (
                                <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur-sm">
                                  {t("history.episode", { n: progress.episodeNumber })}
                                </span>
                              ) : null}
                            </div>
                            <div className="space-y-2 p-2.5">
                              <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-foreground/90 dark:text-white/88">
                                {bookmark.animeTitle}
                              </p>
                            </div>
                          </Link>
                          <div className="px-2.5 pb-2.5">
                            <label className="sr-only" htmlFor={`status-${bookmark.animeId}`}>
                              {t("history.changeStatus")}
                            </label>
                            <select
                              id={`status-${bookmark.animeId}`}
                              disabled={busy}
                              value={bookmark.status}
                              onChange={(e) => void changeStatus(bookmark, e.target.value)}
                              className="h-8 w-full rounded-lg border border-border bg-muted/60 px-2 text-[10px] font-semibold text-muted-foreground outline-none transition-colors focus:border-white/20 dark:border-white/10 dark:bg-black/35 dark:text-white/65"
                            >
                              {bookmarkLabels.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {totalPages > 1 ? (
                    <div className="mt-5 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 rounded-lg border border-border px-3 text-[11px] font-semibold text-muted-foreground disabled:opacity-40 dark:border-white/12 dark:text-white/55"
                      >
                        {t("history.prev")}
                      </button>
                      <span className="font-mono text-[11px] text-white/35">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 rounded-lg border border-border px-3 text-[11px] font-semibold text-muted-foreground disabled:opacity-40 dark:border-white/12 dark:text-white/55"
                      >
                        {t("history.next")}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {listStatus === "watching" ? (
              <section>
                <div className="mb-4">
                  <h2 className="text-sm font-bold tracking-wide text-foreground/90 dark:text-white/85">
                    {t("history.recentEpisodes")}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-mono text-muted-foreground dark:text-white/30">
                    {t("history.recentHint")}
                  </p>
                </div>

                {recentLoading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[72px] animate-pulse rounded-xl border border-border bg-muted/40 dark:border-white/6 dark:bg-white/[0.03]"
                      />
                    ))}
                  </div>
                ) : recent.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground dark:border-white/8 dark:text-white/30">
                    {t("history.emptyRecent")}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recent.map((it, i) => {
                      const progress = pct(it.currentTime, it.duration);
                      const finished = progress >= 90;
                      const poster =
                        it.anime?.cover_image?.large ||
                        it.anime?.cover_image?.extra_large ||
                        "";
                      const href = `${ROUTES.WATCH}?anime=${encodeURIComponent(it.animeId)}&episode=${encodeURIComponent(it.episodeId)}${it.currentTime > 10 && !finished ? `&t=${Math.floor(it.currentTime)}` : ""}`;
                      return (
                        <Link
                          key={`${it.animeId}-${it.episodeId}-${i}`}
                          href={href}
                          className="group flex items-center gap-3.5 rounded-xl border border-border bg-muted/30 p-2.5 transition-colors hover:border-border hover:bg-muted/50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/12 dark:hover:bg-white/[0.04]"
                        >
                          <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/8 sm:w-28">
                            {poster ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={poster}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                              <div
                                className={cn("h-full", finished ? "bg-emerald-400" : "bg-sky-400")}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground dark:text-white/90">
                              {historyTitle(it)}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {it.episodeNumber != null ? (
                                <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-300/80">
                                  {t("history.episode", { n: it.episodeNumber })}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/60 dark:text-white/25">
                                <Clock className="h-2.5 w-2.5" />
                                {relativeTime(it.lastUpdated)}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-[11px] font-semibold text-muted-foreground transition-colors group-hover:text-foreground dark:border-white/12 dark:bg-white/[0.03] dark:text-white/55 dark:group-hover:text-white/85">
                            {finished ? (
                              <RotateCcw className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            <span className="hidden sm:inline">
                              {finished ? t("history.rewatch") : t("history.resume")}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {recentLoading ? (
                  <div className="mt-3 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </Container>
    </div>
  );
}
