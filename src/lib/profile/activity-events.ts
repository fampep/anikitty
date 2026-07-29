import type { AnimeAggregate, ProgressEntry, WatchlistMeta } from "@/lib/history/types";

export type ProfileActivityKind =
  | "started"
  | "finished"
  | "rated"
  | "favorited"
  | "episode"
  | "listed";

export type ProfileActivityEvent = {
  id: string;
  kind: ProfileActivityKind;
  at: string;
  animeId: string;
  title: string;
  poster: string;
  score?: number | null;
  episodeNumber?: number | null;
  status?: string | null;
};

const FAVORITE_SCORE = 9;

/** Derive a chronological activity feed from watch/list/rating data. */
export function deriveProfileActivityEvents(opts: {
  aggregates: AnimeAggregate[];
  episodes: ProgressEntry[];
  watchlist: WatchlistMeta[];
  limit?: number;
}): ProfileActivityEvent[] {
  const { aggregates, episodes, watchlist, limit = 80 } = opts;
  const byId = new Map(aggregates.map((a) => [a.animeId, a]));
  const events: ProfileActivityEvent[] = [];

  for (const ep of episodes) {
    if (!ep.lastUpdated) continue;
    const agg = byId.get(ep.animeId);
    events.push({
      id: `ep:${ep.animeId}:${ep.episodeId}:${ep.lastUpdated}`,
      kind: "episode",
      at: ep.lastUpdated,
      animeId: ep.animeId,
      title: ep.title || agg?.title || ep.animeId,
      poster: ep.poster || agg?.poster || "",
      episodeNumber: ep.episodeNumber,
    });
  }

  for (const w of watchlist) {
    const at = w.updatedAt || w.addedAt;
    if (!at) continue;
    const agg = byId.get(w.animeId);
    const title = w.title || agg?.title || w.animeId;
    const poster = w.poster || agg?.poster || "";

    if (w.status === "completed") {
      events.push({
        id: `fin:${w.animeId}:${at}`,
        kind: "finished",
        at,
        animeId: w.animeId,
        title,
        poster,
        status: w.status,
      });
    } else if (w.status === "watching" || w.status === "plan to watch") {
      events.push({
        id: `start:${w.animeId}:${w.addedAt ?? at}`,
        kind: w.status === "watching" ? "started" : "listed",
        at: w.addedAt ?? at,
        animeId: w.animeId,
        title,
        poster,
        status: w.status,
      });
    } else {
      events.push({
        id: `list:${w.animeId}:${at}`,
        kind: "listed",
        at,
        animeId: w.animeId,
        title,
        poster,
        status: w.status,
      });
    }

    if (w.score != null && w.score > 0) {
      events.push({
        id: `rate:${w.animeId}:${w.score}:${at}`,
        kind: w.score >= FAVORITE_SCORE ? "favorited" : "rated",
        at,
        animeId: w.animeId,
        title,
        poster,
        score: w.score,
      });
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Deduplicate near-identical events (same anime+kind within 2h)
  const seen = new Set<string>();
  const deduped: ProfileActivityEvent[] = [];
  for (const e of events) {
    const bucket = Math.floor(new Date(e.at).getTime() / (2 * 60 * 60 * 1000));
    const key = `${e.kind}:${e.animeId}:${e.score ?? ""}:${e.episodeNumber ?? ""}:${bucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

/** High-rated titles used as a favorites stand-in until a dedicated favorites API exists. */
export function deriveFavoriteShowcase(aggregates: AnimeAggregate[], minScore = 8) {
  const rated = aggregates
    .filter((a) => a.score != null && a.score >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.lastWatched ?? "").localeCompare(a.lastWatched ?? ""));

  const movies = rated.filter((a) => (a.mediaType || "").toLowerCase() === "movie");
  const anime = rated.filter((a) => (a.mediaType || "").toLowerCase() !== "movie");

  const studioMap = new Map<string, number>();
  for (const a of aggregates) {
    for (const s of a.studios ?? []) {
      studioMap.set(s, (studioMap.get(s) ?? 0) + 1);
    }
  }
  const studios = [...studioMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  return {
    anime: anime.slice(0, 24),
    movies: movies.slice(0, 24),
    studios,
    /** Characters / VAs not available from current data. */
    characters: [] as { name: string; count: number }[],
    vas: [] as { name: string; count: number }[],
  };
}

export function reviewsFromAggregates(aggregates: AnimeAggregate[]) {
  return aggregates
    .filter((a) => a.score != null && a.score > 0)
    .sort((a, b) => {
      const tb = b.listUpdatedAt || b.lastWatched || b.addedAt || "";
      const ta = a.listUpdatedAt || a.lastWatched || a.addedAt || "";
      return tb.localeCompare(ta);
    });
}
