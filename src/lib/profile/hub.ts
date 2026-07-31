import type { AnimeAggregate, ProgressEntry } from "@/lib/history/types";
import { relativeTime } from "@/lib/history/derive";

/**
 * Profile anime hub — MVP helpers.
 *
 * Deferred (not in this ship):
 * - Dedicated favorites API / drag-drop reorder
 * - On-hold sticky tab (counts still in overview library)
 * - Character/VA showcase (no data source yet)
 * - Public episode history (heatmap only for others)
 * - Collection view modes (grid/list/compact) + advanced filters
 * - DB migrations / new tables
 */
export const PROFILE_HUB_TABS = [
  "overview",
  "watching",
  "completed",
  "planning",
  "dropped",
  "favorites",
  "reviews",
  "activity",
  "statistics",
] as const;

export type ProfileHubTab = (typeof PROFILE_HUB_TABS)[number];

/** Map hub list tabs → watchlist status strings used by AnimeLists. */
export const HUB_TAB_TO_STATUS: Record<
  Extract<ProfileHubTab, "watching" | "completed" | "planning" | "dropped">,
  string
> = {
  watching: "watching",
  completed: "completed",
  planning: "plan to watch",
  dropped: "dropped",
};

export const LIST_STATUS_STYLES: Record<string, { bar: string; icon: string; tab: string }> = {
  watching: {
    bar: "bg-sky-500",
    icon: "text-sky-400",
    tab: "data-[state=active]:text-sky-300 data-[state=active]:border-sky-500/30 data-[state=active]:bg-sky-500/10",
  },
  plan: {
    bar: "bg-primary",
    icon: "text-zinc-400",
    tab: "data-[state=active]:text-zinc-300 data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10",
  },
  onHold: {
    bar: "bg-amber-500",
    icon: "text-amber-400",
    tab: "data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 data-[state=active]:bg-amber-500/10",
  },
  completed: {
    bar: "bg-emerald-500",
    icon: "text-emerald-400",
    tab: "data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 data-[state=active]:bg-emerald-500/10",
  },
  dropped: {
    bar: "bg-rose-500/90",
    icon: "text-rose-400",
    tab: "data-[state=active]:text-rose-300 data-[state=active]:border-rose-500/30 data-[state=active]:bg-rose-500/10",
  },
};

const TAB_STORAGE_KEY = "kitty:profile-hub-tab";

export function isProfileHubTab(value: string): value is ProfileHubTab {
  return (PROFILE_HUB_TABS as readonly string[]).includes(value);
}

export function readStoredHubTab(): ProfileHubTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY);
    return raw && isProfileHubTab(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredHubTab(tab: ProfileHubTab) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    /* ignore */
  }
}

/** Resolve initial tab from URL (?tab= / legacy ?list=) then localStorage. */
export function resolveInitialHubTab(): ProfileHubTab {
  if (typeof window === "undefined") return "overview";
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab && isProfileHubTab(tab)) return tab;
  const list = params.get("list");
  if (list) {
    const normalized = list.toLowerCase();
    if (normalized === "watching") return "watching";
    if (normalized === "completed") return "completed";
    if (normalized === "dropped") return "dropped";
    if (normalized === "plan to watch" || normalized === "planning") return "planning";
    if (normalized === "on hold") return "overview";
  }
  return readStoredHubTab() ?? "overview";
}

export function syncHubTabToUrl(tab: ProfileHubTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tab === "overview") {
    url.searchParams.delete("tab");
    url.searchParams.delete("list");
  } else {
    url.searchParams.set("tab", tab);
    url.searchParams.delete("list");
  }
  window.history.replaceState(null, "", url.toString());
  writeStoredHubTab(tab);
}

export type ProfileActivityKind =
  | "episode"
  | "started"
  | "finished"
  | "rated"
  | "favorite"
  | "review";

export type ProfileActivityItem = {
  id: string;
  kind: ProfileActivityKind;
  animeId: string;
  title: string;
  poster: string;
  timestamp: string;
  relative: string;
  detail?: string;
  href: string;
  score?: number | null;
  episodeNumber?: number | null;
};

function watchHref(animeId: string, episodeId?: string | null) {
  if (episodeId) {
    return `/anime/watch?anime=${encodeURIComponent(animeId)}&episode=${encodeURIComponent(episodeId)}`;
  }
  return `/anime/${encodeURIComponent(animeId)}`;
}

/** Derive a unified activity timeline from progress + list aggregates. */
export function deriveProfileActivity(
  aggregates: AnimeAggregate[],
  episodes: ProgressEntry[],
  limit = 60,
): ProfileActivityItem[] {
  const items: ProfileActivityItem[] = [];
  const byId = new Map(aggregates.map((a) => [a.animeId, a]));

  for (const ep of episodes) {
    if (!ep.lastUpdated) continue;
    items.push({
      id: `ep-${ep.animeId}-${ep.episodeId}-${ep.lastUpdated}`,
      kind: "episode",
      animeId: ep.animeId,
      title: ep.title || byId.get(ep.animeId)?.title || ep.animeId,
      poster: ep.poster || byId.get(ep.animeId)?.poster || "",
      timestamp: ep.lastUpdated,
      relative: relativeTime(ep.lastUpdated),
      detail: ep.episodeNumber != null ? `Ep ${ep.episodeNumber}` : undefined,
      href: watchHref(ep.animeId, ep.episodeId),
      episodeNumber: ep.episodeNumber,
    });
  }

  for (const a of aggregates) {
    if (a.status === "completed" && (a.listUpdatedAt || a.addedAt)) {
      const ts = a.listUpdatedAt || a.addedAt!;
      items.push({
        id: `fin-${a.animeId}-${ts}`,
        kind: "finished",
        animeId: a.animeId,
        title: a.title,
        poster: a.poster,
        timestamp: ts,
        relative: relativeTime(ts),
        href: watchHref(a.animeId, a.latestEpisode?.episodeId),
      });
    }
    if (a.status === "watching" && a.addedAt) {
      items.push({
        id: `start-${a.animeId}-${a.addedAt}`,
        kind: "started",
        animeId: a.animeId,
        title: a.title,
        poster: a.poster,
        timestamp: a.addedAt,
        relative: relativeTime(a.addedAt),
        href: watchHref(a.animeId, a.latestEpisode?.episodeId),
      });
    }
    if (a.score != null && a.score > 0 && (a.listUpdatedAt || a.addedAt)) {
      const ts = a.listUpdatedAt || a.addedAt!;
      items.push({
        id: `rate-${a.animeId}-${a.score}-${ts}`,
        kind: a.score >= 9 ? "favorite" : "rated",
        animeId: a.animeId,
        title: a.title,
        poster: a.poster,
        timestamp: ts,
        relative: relativeTime(ts),
        score: a.score,
        detail: `${a.score}/10`,
        href: `/anime/${encodeURIComponent(a.animeId)}`,
      });
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Prefer episode events; de-dupe near-identical rate/finish pairs by keeping first of each id prefix group lightly
  const seen = new Set<string>();
  const out: ProfileActivityItem[] = [];
  for (const item of items) {
    const key =
      item.kind === "episode"
        ? item.id
        : `${item.kind}:${item.animeId}:${item.timestamp.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function topRatedFavorites(aggregates: AnimeAggregate[], minScore = 8, limit = 24) {
  return aggregates
    .filter((a) => a.score != null && a.score >= minScore)
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function ratedReviews(aggregates: AnimeAggregate[], limit = 48) {
  return aggregates
    .filter((a) => a.score != null && a.score > 0)
    .slice()
    .sort((a, b) => {
      const tb = b.listUpdatedAt ? new Date(b.listUpdatedAt).getTime() : 0;
      const ta = a.listUpdatedAt ? new Date(a.listUpdatedAt).getTime() : 0;
      return tb - ta || (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, limit);
}

export type CollectionViewMode = "grid" | "list" | "compact";

export function filterSortCollections(
  items: AnimeAggregate[],
  opts: {
    search: string;
    sort: "recent" | "title" | "rating" | "progress";
    minScore?: number | null;
  },
): AnimeAggregate[] {
  const q = opts.search.trim().toLowerCase();
  let out = items;
  if (q) {
    out = out.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.animeId.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q)),
    );
  }
  if (opts.minScore != null) {
    out = out.filter((a) => (a.score ?? 0) >= opts.minScore!);
  }
  const sorted = out.slice();
  switch (opts.sort) {
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "rating":
      sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      break;
    case "progress": {
      sorted.sort((a, b) => {
        const pa = a.latestEpisode?.duration
          ? a.latestEpisode.currentTime / a.latestEpisode.duration
          : a.episodes.length;
        const pb = b.latestEpisode?.duration
          ? b.latestEpisode.currentTime / b.latestEpisode.duration
          : b.episodes.length;
        return pb - pa;
      });
      break;
    }
    case "recent":
    default:
      sorted.sort((a, b) => {
        const ta = a.lastWatched
          ? new Date(a.lastWatched).getTime()
          : a.listUpdatedAt
            ? new Date(a.listUpdatedAt).getTime()
            : 0;
        const tb = b.lastWatched
          ? new Date(b.lastWatched).getTime()
          : b.listUpdatedAt
            ? new Date(b.listUpdatedAt).getTime()
            : 0;
        return tb - ta;
      });
  }
  return sorted;
}
