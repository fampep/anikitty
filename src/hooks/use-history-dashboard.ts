"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useProgressStore } from "@/store/progress-store";
import { anisurgeContinue, anisurgeWatchlist, folderToStatus } from "@/lib/oauth/anisurge";
import { getRecentlyViewed, type RecentlyViewedAnime } from "@/lib/core/recently-viewed";
import { getHistoryNotes, setHistoryNote, type HistoryNotesMap } from "@/lib/history/notes";
import {
  buildAggregates,
  buildActivity,
  computeMilestones,
  computeStats,
  computeStreaks,
  continueWatchingCandidates,
  deriveSessions,
  filterAndSortAggregates,
  recentlyFinished,
} from "@/lib/history/derive";
import type {
  AnimeAggregate,
  HistoryFilters,
  HistoryStats,
  HistoryViewMode,
  Milestone,
  ProgressEntry,
  WatchSession,
  WatchlistMeta,
} from "@/lib/history/types";

const PROGRESS_PAGE = 200;
const LIST_PAGE = 200;
const CACHE_PREFIX = "kitty:history-dash:";

const DEFAULT_FILTERS: HistoryFilters = {
  mediaType: "all",
  airingStatus: "all",
  watchStatus: "all",
  search: "",
  groupBy: "auto",
  sort: "recent",
  customFrom: null,
  customTo: null,
};

type CacheShape = {
  userId: string;
  episodes: ProgressEntry[];
  watchlist: WatchlistMeta[];
  savedAt: number;
};

function readCache(userId: string): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.savedAt > 10 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, episodes: ProgressEntry[], watchlist: WatchlistMeta[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheShape = { userId, episodes, watchlist, savedAt: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

function mapProgressRow(r: Record<string, unknown>): ProgressEntry {
  const animeId = String(r.animeId ?? "");
  const episodeId = String(r.episodeId ?? "");
  const anime = (r.anime ?? null) as {
    title?: { english?: string | null; romaji?: string | null };
    cover_image?: { large?: string | null; extra_large?: string | null };
  } | null;
  return {
    animeId,
    episodeId,
    episodeNumber:
      r.episodeNumber != null
        ? Number(r.episodeNumber)
        : parseInt(episodeId.replace("ep-", ""), 10) || null,
    currentTime: Number(r.currentTime ?? 0),
    duration: Number(r.duration ?? 0),
    language: String(r.language ?? "sub"),
    lastUpdated: r.lastUpdated ? String(r.lastUpdated) : null,
    title: anime?.title?.english || anime?.title?.romaji || animeId,
    poster: anime?.cover_image?.large || anime?.cover_image?.extra_large || "",
    anilistId: null,
  };
}

function mapWatchlistRow(item: Record<string, unknown>): WatchlistMeta {
  const anime = (item.anime ?? null) as {
    title?: { english?: string | null; romaji?: string | null };
    cover_image?: { large?: string | null; extra_large?: string | null };
  } | null;
  return {
    animeId: String(item.animeId ?? ""),
    status: folderToStatus(String(item.folder ?? "WATCHING")),
    score: item.score != null ? Number(item.score) : null,
    addedAt: item.addedAt ? String(item.addedAt) : null,
    updatedAt: item.updatedAt ? String(item.updatedAt) : item.addedAt ? String(item.addedAt) : null,
    title: anime?.title?.english || anime?.title?.romaji || String(item.animeId ?? ""),
    poster: anime?.cover_image?.large || anime?.cover_image?.extra_large || "",
    anilistId: item.anilistId != null ? Number(item.anilistId) : null,
    malId: item.malId != null ? Number(item.malId) : null,
    rewatchCount: Number(item.rewatchCount ?? 0),
  };
}

async function fetchAllProgress(): Promise<ProgressEntry[]> {
  const all: ProgressEntry[] = [];
  let offset = 0;
  for (;;) {
    const res = await anisurgeContinue.get(false, PROGRESS_PAGE, offset);
    const rows = (res?.data ?? []) as Record<string, unknown>[];
    for (const r of rows) {
      const mapped = mapProgressRow(r);
      if (mapped.animeId && mapped.episodeId) all.push(mapped);
    }
    if (rows.length < PROGRESS_PAGE) break;
    offset += PROGRESS_PAGE;
  }
  // Deduplicate by animeId+episodeId keeping newest
  const map = new Map<string, ProgressEntry>();
  for (const ep of all) {
    const key = `${ep.animeId}:${ep.episodeId}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, ep);
      continue;
    }
    const pt = prev.lastUpdated ? new Date(prev.lastUpdated).getTime() : 0;
    const nt = ep.lastUpdated ? new Date(ep.lastUpdated).getTime() : 0;
    if (nt >= pt) map.set(key, ep);
  }
  return [...map.values()];
}

async function fetchAllWatchlist(): Promise<WatchlistMeta[]> {
  const all: WatchlistMeta[] = [];
  let offset = 0;
  for (;;) {
    const res = await anisurgeWatchlist.get(undefined, LIST_PAGE, offset);
    const rows = (res?.results ?? []) as Record<string, unknown>[];
    for (const r of rows) {
      const mapped = mapWatchlistRow(r);
      if (mapped.animeId) all.push(mapped);
    }
    const total = Number(res?.total ?? all.length);
    offset += LIST_PAGE;
    if (rows.length < LIST_PAGE || offset >= total) break;
  }
  // Deduplicate by animeId
  const map = new Map<string, WatchlistMeta>();
  for (const w of all) map.set(w.animeId, w);
  return [...map.values()];
}

export function useHistoryDashboard() {
  const auth = useAuthStore((s) => s.auth);
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const localVersion = useProgressStore((s) => s.localVersion);

  const [viewMode, setViewMode] = useState<HistoryViewMode>("timeline");
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [episodes, setEpisodes] = useState<ProgressEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistMeta[]>([]);
  const [notes, setNotes] = useState<HistoryNotesMap>({});
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(36);
  const fetchGen = useRef(0);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!auth) {
        setEpisodes([]);
        setWatchlist([]);
        setLoading(false);
        return;
      }
      const gen = ++fetchGen.current;
      const soft = opts?.soft ?? false;
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const cached = readCache(auth.id);
      if (cached && !soft) {
        setEpisodes(cached.episodes);
        setWatchlist(cached.watchlist);
        setLoading(false);
      }

      try {
        const [eps, list] = await Promise.all([fetchAllProgress(), fetchAllWatchlist()]);
        if (gen !== fetchGen.current) return;
        setEpisodes(eps);
        setWatchlist(list);
        writeCache(auth.id, eps, list);
      } catch {
        if (gen !== fetchGen.current) return;
        if (!cached) setError("load");
      } finally {
        if (gen === fetchGen.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [auth],
  );

  useEffect(() => {
    void load();
  }, [load, watchlistVersion, localVersion]);

  useEffect(() => {
    setNotes(getHistoryNotes());
    setRecentlyViewed(getRecentlyViewed());
    const onNotes = () => setNotes(getHistoryNotes());
    const onViewed = () => setRecentlyViewed(getRecentlyViewed());
    window.addEventListener("anikitty:history-notes", onNotes);
    window.addEventListener("anikitty:recently-viewed", onViewed);
    window.addEventListener("storage", onNotes);
    return () => {
      window.removeEventListener("anikitty:history-notes", onNotes);
      window.removeEventListener("anikitty:recently-viewed", onViewed);
      window.removeEventListener("storage", onNotes);
    };
  }, []);

  const aggregates = useMemo(
    () => buildAggregates(episodes, watchlist, notes),
    [episodes, watchlist, notes],
  );

  const filtered = useMemo(
    () => filterAndSortAggregates(aggregates, filters),
    [aggregates, filters],
  );

  const visibleItems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + 36, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    setVisibleCount(36);
  }, [filters, viewMode]);

  const stats: HistoryStats = useMemo(
    () => computeStats(aggregates, episodes),
    [aggregates, episodes],
  );

  const streaks = useMemo(
    () => computeStreaks(buildActivity(episodes)),
    [episodes],
  );

  const milestones: Milestone[] = useMemo(
    () =>
      computeMilestones({
        totalEpisodes: stats.totalEpisodes,
        completedCount: stats.completedCount,
        watchTimeSeconds: stats.watchTimeSeconds,
        longestStreak: stats.longestStreak,
      }),
    [stats],
  );

  const sessions: WatchSession[] = useMemo(() => deriveSessions(episodes), [episodes]);

  const continueItems = useMemo(
    () => continueWatchingCandidates(aggregates).slice(0, 12),
    [aggregates],
  );

  const finishedItems = useMemo(
    () => recentlyFinished(aggregates).slice(0, 12),
    [aggregates],
  );

  const recentlyAdded = useMemo(
    () =>
      aggregates
        .filter((a) => a.addedAt)
        .slice()
        .sort((a, b) => {
          const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 16),
    [aggregates],
  );

  const updateFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const saveNote = useCallback((animeId: string, note: string) => {
    setNotes(setHistoryNote(animeId, note));
  }, []);

  const isEmpty = !loading && aggregates.length === 0;

  return {
    auth,
    viewMode,
    setViewMode,
    filters,
    updateFilters,
    aggregates,
    filtered,
    visibleItems,
    hasMore,
    loadMore,
    episodes,
    sessions,
    stats,
    streaks,
    milestones,
    continueItems,
    finishedItems,
    recentlyAdded,
    recentlyViewed,
    loading,
    refreshing,
    error,
    reload: () => load({ soft: true }),
    saveNote,
    isEmpty,
  };
}

export type HistoryDashboard = ReturnType<typeof useHistoryDashboard>;

export function watchHref(a: AnimeAggregate, resume = true): string {
  const ep = a.latestEpisode;
  if (!ep?.episodeId) return `/anime/${encodeURIComponent(a.animeId)}`;
  const base = `/anime/watch?anime=${encodeURIComponent(a.animeId)}&episode=${encodeURIComponent(ep.episodeId)}`;
  if (resume && ep.currentTime > 10) {
    const pct =
      ep.duration > 0 ? Math.round((ep.currentTime / ep.duration) * 100) : 0;
    if (pct < 90) return `${base}&t=${Math.floor(ep.currentTime)}`;
  }
  return base;
}
