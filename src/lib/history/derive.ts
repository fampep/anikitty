import type {
  AnimeAggregate,
  DayActivity,
  HistoryFilters,
  HistoryGroupBy,
  HistoryStats,
  HistorySortKey,
  Milestone,
  ProgressEntry,
  WatchSession,
  WatchlistMeta,
} from "./types";

const DAY_MS = 86_400_000;
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
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

export function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 48) return rem ? `${h}h ${rem}m` : `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h`;
}

export function progressPct(current: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((current / duration) * 100));
}

export function buildAggregates(
  episodes: ProgressEntry[],
  watchlist: WatchlistMeta[],
  notes: Record<string, string>,
): AnimeAggregate[] {
  const byAnime = new Map<string, ProgressEntry[]>();
  for (const ep of episodes) {
    const list = byAnime.get(ep.animeId) ?? [];
    list.push(ep);
    byAnime.set(ep.animeId, list);
  }

  const listById = new Map(watchlist.map((w) => [w.animeId, w]));
  const animeIds = new Set([...byAnime.keys(), ...listById.keys()]);

  const out: AnimeAggregate[] = [];
  for (const animeId of animeIds) {
    const eps = (byAnime.get(animeId) ?? []).slice().sort((a, b) => {
      const ta = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const tb = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return tb - ta;
    });
    const meta = listById.get(animeId);
    const latest = eps[0] ?? null;
    const title = latest?.title || meta?.title || animeId;
    const poster = latest?.poster || meta?.poster || "";
    const totalWatchedSeconds = eps.reduce((sum, e) => {
      const watched = Math.min(Math.max(0, e.currentTime), Math.max(0, e.duration || e.currentTime));
      return sum + watched;
    }, 0);

    out.push({
      animeId,
      title,
      poster,
      status: meta?.status ?? null,
      score: meta?.score ?? null,
      addedAt: meta?.addedAt ?? null,
      listUpdatedAt: meta?.updatedAt ?? null,
      lastWatched: latest?.lastUpdated ?? null,
      episodes: eps,
      totalWatchedSeconds,
      latestEpisode: latest,
      rewatchCount: meta?.rewatchCount ?? 0,
      anilistId: meta?.anilistId ?? latest?.anilistId ?? null,
      malId: meta?.malId ?? null,
      mediaType: meta?.mediaType ?? null,
      airingStatus: meta?.airingStatus ?? null,
      genres: meta?.genres ?? [],
      studios: meta?.studios ?? [],
      note: notes[animeId] ?? "",
    });
  }

  return out;
}

/** Group consecutive same-anime episodes within a 4h gap into sessions. */
export function deriveSessions(episodes: ProgressEntry[]): WatchSession[] {
  const sorted = episodes
    .filter((e) => e.lastUpdated)
    .slice()
    .sort((a, b) => new Date(a.lastUpdated!).getTime() - new Date(b.lastUpdated!).getTime());

  const sessions: WatchSession[] = [];
  let cur: {
    animeId: string;
    title: string;
    poster: string;
    startAt: string;
    endAt: string;
    eps: ProgressEntry[];
  } | null = null;

  const flush = () => {
    if (!cur || cur.eps.length === 0) return;
    const durationSeconds = cur.eps.reduce(
      (s, e) => s + Math.min(Math.max(0, e.currentTime), Math.max(0, e.duration || e.currentTime)),
      0,
    );
    const nums = cur.eps
      .map((e) => e.episodeNumber)
      .filter((n): n is number => n != null)
      .sort((a, b) => a - b);
    sessions.push({
      id: `${cur.animeId}-${cur.startAt}`,
      animeId: cur.animeId,
      title: cur.title,
      poster: cur.poster,
      startAt: cur.startAt,
      endAt: cur.endAt,
      episodeCount: cur.eps.length,
      episodeNumbers: nums,
      durationSeconds,
    });
    cur = null;
  };

  for (const ep of sorted) {
    const t = new Date(ep.lastUpdated!).getTime();
    if (
      cur &&
      cur.animeId === ep.animeId &&
      t - new Date(cur.endAt).getTime() <= SESSION_GAP_MS
    ) {
      cur.endAt = ep.lastUpdated!;
      cur.eps.push(ep);
    } else {
      flush();
      cur = {
        animeId: ep.animeId,
        title: ep.title,
        poster: ep.poster,
        startAt: ep.lastUpdated!,
        endAt: ep.lastUpdated!,
        eps: [ep],
      };
    }
  }
  flush();

  return sessions.sort(
    (a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime(),
  );
}

export function computeStreaks(activity: DayActivity[]): {
  current: number;
  longest: number;
  last7: number;
  last30: number;
  last100: number;
} {
  const set = new Set(activity.filter((a) => a.episodes > 0).map((a) => a.date));
  if (set.size === 0) {
    return { current: 0, longest: 0, last7: 0, last30: 0, last100: 0 };
  }

  const today = startOfDay(new Date());
  let current = 0;
  for (let i = 0; i < 4000; i++) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = toDateKey(d.toISOString())!;
    if (set.has(key)) current += 1;
    else if (i > 0) break;
    // Allow today empty — streak measured through yesterday
    else if (i === 0 && !set.has(key)) {
      /* check yesterday start */
    }
  }
  // Recalculate current properly: if today empty, start from yesterday
  {
    current = 0;
    let cursor = today;
    const todayKey = toDateKey(cursor.toISOString())!;
    if (!set.has(todayKey)) {
      cursor = new Date(today.getTime() - DAY_MS);
    }
    for (let i = 0; i < 4000; i++) {
      const d = new Date(cursor.getTime() - i * DAY_MS);
      const key = toDateKey(d.toISOString())!;
      if (set.has(key)) current += 1;
      else break;
    }
  }

  let longest = 0;
  let run = 0;
  const sorted = [...set].sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(sorted[i - 1] + "T12:00:00").getTime();
      const cur = new Date(sorted[i] + "T12:00:00").getTime();
      if (cur - prev === DAY_MS) run += 1;
      else run = 1;
    }
    longest = Math.max(longest, run);
  }

  const countInWindow = (days: number) => {
    let n = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const key = toDateKey(d.toISOString())!;
      if (set.has(key)) n += 1;
    }
    return n;
  };

  return {
    current,
    longest,
    last7: countInWindow(7),
    last30: countInWindow(30),
    last100: countInWindow(100),
  };
}

export function computeMilestones(stats: {
  totalEpisodes: number;
  completedCount: number;
  watchTimeSeconds: number;
  longestStreak: number;
}): Milestone[] {
  const hours = stats.watchTimeSeconds / 3600;
  return [
    {
      id: "eps_100",
      unlocked: stats.totalEpisodes >= 100,
      progress: Math.min(stats.totalEpisodes, 100),
      target: 100,
    },
    {
      id: "eps_500",
      unlocked: stats.totalEpisodes >= 500,
      progress: Math.min(stats.totalEpisodes, 500),
      target: 500,
    },
    {
      id: "completed_100",
      unlocked: stats.completedCount >= 100,
      progress: Math.min(stats.completedCount, 100),
      target: 100,
    },
    {
      id: "hours_1000",
      unlocked: hours >= 1000,
      progress: Math.min(hours, 1000),
      target: 1000,
    },
    {
      id: "streak_7",
      unlocked: stats.longestStreak >= 7,
      progress: Math.min(stats.longestStreak, 7),
      target: 7,
    },
    {
      id: "streak_30",
      unlocked: stats.longestStreak >= 30,
      progress: Math.min(stats.longestStreak, 30),
      target: 30,
    },
    {
      id: "streak_100",
      unlocked: stats.longestStreak >= 100,
      progress: Math.min(stats.longestStreak, 100),
      target: 100,
    },
    {
      id: "streak_365",
      unlocked: stats.longestStreak >= 365,
      progress: Math.min(stats.longestStreak, 365),
      target: 365,
    },
  ];
}

export function buildActivity(episodes: ProgressEntry[]): DayActivity[] {
  const map = new Map<string, DayActivity>();
  for (const ep of episodes) {
    const key = toDateKey(ep.lastUpdated);
    if (!key) continue;
    const cur = map.get(key) ?? { date: key, episodes: 0, minutes: 0 };
    cur.episodes += 1;
    cur.minutes += Math.round(
      Math.min(Math.max(0, ep.currentTime), Math.max(0, ep.duration || ep.currentTime)) / 60,
    );
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function computeStats(
  aggregates: AnimeAggregate[],
  episodes: ProgressEntry[],
): HistoryStats {
  const activityByDay = buildActivity(episodes);
  const streaks = computeStreaks(activityByDay);

  const withProgress = aggregates.filter((a) => a.episodes.length > 0);
  const completedCount = aggregates.filter((a) => a.status === "completed").length;
  const movies = aggregates.filter(
    (a) => (a.mediaType ?? "").toLowerCase() === "movie",
  ).length;

  const watchTimeSeconds = aggregates.reduce((s, a) => s + a.totalWatchedSeconds, 0);
  const rated = aggregates.filter((a) => a.score != null && a.score > 0);
  const avgRating =
    rated.length > 0
      ? rated.reduce((s, a) => s + (a.score ?? 0), 0) / rated.length
      : null;

  const genreCount = new Map<string, number>();
  const studioCount = new Map<string, number>();
  const typeCount = new Map<string, number>();
  for (const a of aggregates) {
    for (const g of a.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
    for (const s of a.studios) studioCount.set(s, (studioCount.get(s) ?? 0) + 1);
    const t = a.mediaType || "Unknown";
    typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
  }

  const topOf = (m: Map<string, number>) => {
    let best: string | null = null;
    let n = 0;
    for (const [k, v] of m) {
      if (v > n && k !== "Unknown") {
        best = k;
        n = v;
      }
    }
    return best;
  };

  const spanDays = Math.max(
    1,
    activityByDay.length > 0
      ? Math.ceil(
          (Date.now() - new Date(activityByDay[0].date + "T00:00:00").getTime()) / DAY_MS,
        )
      : 1,
  );
  const totalEps = episodes.length;
  const avgEpsPerDay = totalEps / spanDays;
  const avgHoursPerWeek = (watchTimeSeconds / 3600 / spanDays) * 7;

  const hoursByMonthMap = new Map<string, number>();
  const epsByWeekMap = new Map<string, number>();
  const weekday = new Array(7).fill(0) as number[];
  const hours = new Array(24).fill(0) as number[];

  for (const ep of episodes) {
    if (!ep.lastUpdated) continue;
    const d = new Date(ep.lastUpdated);
    if (Number.isNaN(d.getTime())) continue;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const watched =
      Math.min(Math.max(0, ep.currentTime), Math.max(0, ep.duration || ep.currentTime)) / 3600;
    hoursByMonthMap.set(monthKey, (hoursByMonthMap.get(monthKey) ?? 0) + watched);

    const weekStart = startOfDay(new Date(d));
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = toDateKey(weekStart.toISOString())!;
    epsByWeekMap.set(weekKey, (epsByWeekMap.get(weekKey) ?? 0) + 1);

    weekday[d.getDay()] += 1;
    hours[d.getHours()] += 1;
  }

  const ratingDistMap = new Map<string, number>();
  for (const a of rated) {
    const label = String(a.score);
    ratingDistMap.set(label, (ratingDistMap.get(label) ?? 0) + 1);
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    totalAnime: withProgress.length || aggregates.length,
    totalEpisodes: totalEps,
    totalMovies: movies,
    watchTimeSeconds,
    avgRating,
    ratedCount: rated.length,
    favoriteGenre: topOf(genreCount),
    favoriteStudio: topOf(studioCount),
    favoriteVa: null,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    avgEpsPerDay,
    avgHoursPerWeek,
    completedCount,
    activityByDay,
    hoursByMonth: [...hoursByMonthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, h]) => ({ key, hours: Math.round(h * 10) / 10 })),
    epsByWeek: [...epsByWeekMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-16)
      .map(([key, episodes]) => ({ key, episodes })),
    genreDist: [...genreCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count })),
    typeDist: [...typeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count })),
    ratingDist: [...ratingDistMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([label, count]) => ({ label, count })),
    weekdayHabits: WEEKDAYS.map((label, i) => ({ label, count: weekday[i] })),
    hourHabits: hours.map((count, i) => ({
      label: `${String(i).padStart(2, "0")}`,
      count,
    })),
  };
}

function inGroupWindow(iso: string | null, groupBy: HistoryGroupBy, customFrom: string | null, customTo: string | null): boolean {
  if (groupBy === "auto") return true;
  if (!iso) return groupBy === "custom" ? false : true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const now = startOfDay(new Date());
  const day = startOfDay(new Date(iso));

  switch (groupBy) {
    case "today":
      return day.getTime() === now.getTime();
    case "yesterday":
      return day.getTime() === now.getTime() - DAY_MS;
    case "thisWeek": {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return day >= start;
    }
    case "lastWeek": {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return day >= start && day < end;
    }
    case "thisMonth":
      return day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth();
    case "lastMonth": {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return day.getFullYear() === lm.getFullYear() && day.getMonth() === lm.getMonth();
    }
    case "year":
      return day.getFullYear() === now.getFullYear();
    case "custom": {
      if (!customFrom && !customTo) return true;
      const from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : -Infinity;
      const to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
      return t >= from && t <= to;
    }
    default:
      return true;
  }
}

export function autoGroupLabel(iso: string | null): string {
  if (!iso) return "Unknown";
  const day = startOfDay(new Date(iso));
  const now = startOfDay(new Date());
  const diff = Math.round((now.getTime() - day.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This Week";
  if (diff < 14) return "Last Week";
  if (day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth()) {
    return "This Month";
  }
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (day.getFullYear() === lm.getFullYear() && day.getMonth() === lm.getMonth()) {
    return "Last Month";
  }
  return String(day.getFullYear());
}

function matchesSearch(a: AnimeAggregate, q: string): boolean {
  if (!q) return true;
  const hay = [
    a.title,
    a.note,
    ...a.genres,
    ...a.studios,
    a.mediaType ?? "",
    a.status ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function filterAndSortAggregates(
  aggregates: AnimeAggregate[],
  filters: HistoryFilters,
): AnimeAggregate[] {
  const q = filters.search.trim().toLowerCase();

  let list = aggregates.filter((a) => {
    if (filters.watchStatus !== "all") {
      if (filters.watchStatus === "rewatching") {
        if (!(a.rewatchCount > 0 || a.status === "watching")) return false;
        if (a.rewatchCount <= 0) return false;
      } else if (a.status !== filters.watchStatus) {
        // Allow progress-only titles when filter is watching and no list status
        if (!(filters.watchStatus === "watching" && !a.status && a.episodes.length > 0)) {
          return false;
        }
      }
    }

    if (filters.mediaType !== "all") {
      if (!a.mediaType) {
        /* best-effort: keep when unknown so filter isn't empty */
      } else if (a.mediaType.toLowerCase() !== filters.mediaType.toLowerCase()) {
        return false;
      }
    }

    if (filters.airingStatus !== "all") {
      const s = (a.airingStatus ?? "").toLowerCase();
      if (s) {
        const map: Record<string, string[]> = {
          airing: ["releasing", "airing", "currently_airing"],
          finished: ["finished", "completed"],
          upcoming: ["not_yet_released", "upcoming", "hiatus"],
        };
        const ok = map[filters.airingStatus] ?? [];
        if (!ok.some((x) => s.includes(x))) return false;
      }
    }

    if (!matchesSearch(a, q)) return false;

    const anchor = a.lastWatched ?? a.addedAt ?? a.listUpdatedAt;
    if (!inGroupWindow(anchor, filters.groupBy, filters.customFrom, filters.customTo)) {
      return false;
    }

    return true;
  });

  list = sortAggregates(list, filters.sort);
  return list;
}

export function sortAggregates(list: AnimeAggregate[], sort: HistorySortKey): AnimeAggregate[] {
  const copy = list.slice();
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => t(a.lastWatched) - t(b.lastWatched));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return copy.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    case "release":
      // No release date in local data — fall back to addedAt
      return copy.sort((a, b) => t(b.addedAt) - t(a.addedAt));
    case "updated":
      return copy.sort(
        (a, b) => t(b.listUpdatedAt ?? b.lastWatched) - t(a.listUpdatedAt ?? a.lastWatched),
      );
    case "duration":
      return copy.sort((a, b) => b.totalWatchedSeconds - a.totalWatchedSeconds);
    case "recent":
    default:
      return copy.sort((a, b) => t(b.lastWatched) - t(a.lastWatched));
  }
}

export function groupTimelineItems(
  items: AnimeAggregate[],
  groupBy: HistoryGroupBy,
): { label: string; items: AnimeAggregate[] }[] {
  if (groupBy !== "auto") {
    return items.length ? [{ label: "", items }] : [];
  }
  const map = new Map<string, AnimeAggregate[]>();
  const order: string[] = [];
  for (const item of items) {
    const label = autoGroupLabel(item.lastWatched ?? item.addedAt);
    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(item);
  }
  return order.map((label) => ({ label, items: map.get(label)! }));
}

export function continueWatchingCandidates(aggregates: AnimeAggregate[]): AnimeAggregate[] {
  return aggregates
    .filter((a) => {
      if (!a.latestEpisode) return false;
      if (a.status === "completed" || a.status === "dropped" || a.status === "plan to watch") {
        return false;
      }
      // Prefer in-progress episodes; fully finished eps still resume if list says watching/hold
      const pct = progressPct(a.latestEpisode.currentTime, a.latestEpisode.duration);
      if (pct < 95) return true;
      return a.status === "watching" || a.status === "on hold" || !a.status;
    })
    .sort((a, b) => {
      const ta = a.lastWatched ? new Date(a.lastWatched).getTime() : 0;
      const tb = b.lastWatched ? new Date(b.lastWatched).getTime() : 0;
      return tb - ta;
    });
}

export function recentlyFinished(aggregates: AnimeAggregate[]): AnimeAggregate[] {
  return aggregates
    .filter((a) => a.status === "completed")
    .sort((a, b) => {
      const ta = a.listUpdatedAt ?? a.lastWatched ?? a.addedAt;
      const tb = b.listUpdatedAt ?? b.lastWatched ?? b.addedAt;
      return (tb ? new Date(tb).getTime() : 0) - (ta ? new Date(ta).getTime() : 0);
    });
}

export function timeToFinishDays(a: AnimeAggregate): number | null {
  if (!a.addedAt || !a.lastWatched) return null;
  const start = new Date(a.addedAt).getTime();
  const end = new Date(a.lastWatched).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.max(1, Math.round((end - start) / DAY_MS));
}
