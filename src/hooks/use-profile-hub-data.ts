"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useProgressStore } from "@/store/progress-store";
import { anisurgeContinue, anisurgeWatchlist, folderToStatus } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import {
  buildAggregates,
  buildActivity,
  computeMilestones,
  computeStats,
  computeStreaks,
  continueWatchingCandidates,
  recentlyFinished,
} from "@/lib/history/derive";
import type {
  AnimeAggregate,
  HistoryStats,
  Milestone,
  ProgressEntry,
  WatchlistMeta,
} from "@/lib/history/types";
import {
  deriveProfileActivity,
  ratedReviews,
  topRatedFavorites,
  type ProfileActivityItem,
} from "@/lib/profile/hub";

const PROGRESS_PAGE = 200;
const LIST_PAGE = 200;
const CACHE_PREFIX = "kitty:profile-hub:";

type CacheShape = {
  key: string;
  episodes: ProgressEntry[];
  watchlist: WatchlistMeta[];
  savedAt: number;
};

function readCache(key: string): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (parsed.key !== key) return null;
    if (Date.now() - parsed.savedAt > 10 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, episodes: ProgressEntry[], watchlist: WatchlistMeta[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheShape = { key, episodes, watchlist, savedAt: Date.now() };
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
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

async function fetchOwnProgress(): Promise<ProgressEntry[]> {
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

async function fetchOwnWatchlist(): Promise<WatchlistMeta[]> {
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
  const map = new Map<string, WatchlistMeta>();
  for (const w of all) map.set(w.animeId, w);
  return [...map.values()];
}

const PUBLIC_FOLDERS = ["WATCHING", "COMPLETED", "PLANNING", "PAUSED", "DROPPED"] as const;

async function fetchPublicWatchlist(username: string): Promise<WatchlistMeta[]> {
  const all: WatchlistMeta[] = [];
  for (const folder of PUBLIC_FOLDERS) {
    let offset = 0;
    for (;;) {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/watchlist?folder=${folder}&limit=${LIST_PAGE}&offset=${offset}`,
        withAuth(),
      );
      if (!res.ok) break;
      const data = await res.json();
      const rows = (data.results ?? []) as Record<string, unknown>[];
      for (const r of rows) {
        const mapped = mapWatchlistRow(r);
        if (mapped.animeId) all.push(mapped);
      }
      const total = Number(data.total ?? all.length);
      offset += LIST_PAGE;
      if (rows.length < LIST_PAGE || offset >= total) break;
    }
  }
  const map = new Map<string, WatchlistMeta>();
  for (const w of all) map.set(w.animeId, w);
  return [...map.values()];
}

export type ProfileHubData = {
  aggregates: AnimeAggregate[];
  episodes: ProgressEntry[];
  stats: HistoryStats;
  streaks: ReturnType<typeof computeStreaks>;
  milestones: Milestone[];
  activity: ProfileActivityItem[];
  continueItems: AnimeAggregate[];
  recentlyWatched: AnimeAggregate[];
  finishedItems: AnimeAggregate[];
  favorites: AnimeAggregate[];
  reviews: AnimeAggregate[];
  byStatus: (status: string) => AnimeAggregate[];
  loading: boolean;
  error: string | null;
  isOwn: boolean;
  reload: () => void;
};

/**
 * Profile hub dataset. Own profile: progress + watchlist (rich).
 * Public profile: watchlist-only aggregates (no episode history beyond heatmap API elsewhere).
 */
export function useProfileHubData(username: string, isOwn: boolean): ProfileHubData {
  const auth = useAuthStore((s) => s.auth);
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const localVersion = useProgressStore((s) => s.localVersion);

  const [episodes, setEpisodes] = useState<ProgressEntry[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);

  const cacheKey = isOwn ? `own:${auth?.id ?? "anon"}` : `pub:${username}`;

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!username) {
        setLoading(false);
        return;
      }
      if (isOwn && !auth) {
        setEpisodes([]);
        setWatchlist([]);
        setLoading(false);
        return;
      }

      const gen = ++fetchGen.current;
      const soft = opts?.soft ?? false;
      if (!soft) setLoading(true);
      setError(null);

      const cached = readCache(cacheKey);
      if (cached && !soft) {
        setEpisodes(cached.episodes);
        setWatchlist(cached.watchlist);
        setLoading(false);
      }

      try {
        if (isOwn) {
          const [eps, list] = await Promise.all([fetchOwnProgress(), fetchOwnWatchlist()]);
          if (gen !== fetchGen.current) return;
          setEpisodes(eps);
          setWatchlist(list);
          writeCache(cacheKey, eps, list);
        } else {
          const list = await fetchPublicWatchlist(username);
          if (gen !== fetchGen.current) return;
          setEpisodes([]);
          setWatchlist(list);
          writeCache(cacheKey, [], list);
        }
      } catch {
        if (gen !== fetchGen.current) return;
        if (!cached) setError("load");
      } finally {
        if (gen === fetchGen.current) setLoading(false);
      }
    },
    [username, isOwn, auth, cacheKey],
  );

  useEffect(() => {
    void load();
  }, [load, watchlistVersion, localVersion]);

  const aggregates = useMemo(
    () => buildAggregates(episodes, watchlist, {}),
    [episodes, watchlist],
  );

  const stats = useMemo(() => computeStats(aggregates, episodes), [aggregates, episodes]);
  const streaks = useMemo(() => computeStreaks(buildActivity(episodes)), [episodes]);
  const milestones = useMemo(
    () =>
      computeMilestones({
        totalEpisodes: stats.totalEpisodes,
        completedCount: stats.completedCount,
        watchTimeSeconds: stats.watchTimeSeconds,
        longestStreak: stats.longestStreak,
      }),
    [stats],
  );

  const activity = useMemo(
    () => deriveProfileActivity(aggregates, episodes, 80),
    [aggregates, episodes],
  );

  const continueItems = useMemo(
    () => continueWatchingCandidates(aggregates).slice(0, 12),
    [aggregates],
  );

  const recentlyWatched = useMemo(
    () =>
      aggregates
        .filter((a) => a.lastWatched)
        .slice()
        .sort((a, b) => {
          const ta = a.lastWatched ? new Date(a.lastWatched).getTime() : 0;
          const tb = b.lastWatched ? new Date(b.lastWatched).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 16),
    [aggregates],
  );

  const finishedItems = useMemo(() => recentlyFinished(aggregates).slice(0, 12), [aggregates]);
  const favorites = useMemo(() => topRatedFavorites(aggregates), [aggregates]);
  const reviews = useMemo(() => ratedReviews(aggregates), [aggregates]);

  const byStatus = useCallback(
    (status: string) => {
      const target = status.toLowerCase();
      // Also accept folder-style via statusToFolder reverse
      return aggregates.filter((a) => (a.status ?? "").toLowerCase() === target);
    },
    [aggregates],
  );

  return {
    aggregates,
    episodes,
    stats,
    streaks,
    milestones,
    activity,
    continueItems,
    recentlyWatched,
    finishedItems,
    favorites,
    reviews,
    byStatus,
    loading,
    error,
    isOwn,
    reload: () => void load({ soft: true }),
  };
}
