import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

export type EpisodeStatRow = {
  episode: number;
  plays: number;
  completions: number;
  completionRate: number;
  avgRating: number | null;
  ratingCount: number;
  comments: number;
};

// episode_id is a string like "ep-5" (watch_progress/anime_view_events convention);
// episode_ratings/comments already store a numeric episode_number. Parse the
// digits out of episode_id so all three sources key on the same episode number.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const safeRows = async (q: Parameters<typeof db.execute>[0]) => {
    try {
      return rowsOf(await db.execute(q));
    } catch {
      return [];
    }
  };

  const [playRows, ratingRows, commentRows] = await Promise.all([
    safeRows(sql`
      SELECT
        NULLIF(regexp_replace(episode_id, '[^0-9]', '', 'g'), '')::int AS episode,
        COUNT(*) FILTER (WHERE event_type = 'view_start')::int AS plays,
        COUNT(*) FILTER (WHERE event_type = 'view_complete')::int AS completions
      FROM anime_view_events
      WHERE anime_id = ${id} AND episode_id IS NOT NULL
      GROUP BY 1
      HAVING NULLIF(regexp_replace(episode_id, '[^0-9]', '', 'g'), '') IS NOT NULL
    `),
    safeRows(sql`
      SELECT episode_number AS episode, AVG(score) AS avg_rating, COUNT(*)::int AS rating_count
      FROM episode_ratings
      WHERE anime_id = ${id}
      GROUP BY episode_number
    `),
    safeRows(sql`
      SELECT episode_number AS episode, COUNT(*)::int AS comment_count
      FROM comments
      WHERE anime_id = ${id} AND episode_number IS NOT NULL
      GROUP BY episode_number
    `),
  ]);

  const byEpisode = new Map<number, EpisodeStatRow>();
  const ensure = (episode: number): EpisodeStatRow => {
    let row = byEpisode.get(episode);
    if (!row) {
      row = { episode, plays: 0, completions: 0, completionRate: 0, avgRating: null, ratingCount: 0, comments: 0 };
      byEpisode.set(episode, row);
    }
    return row;
  };

  for (const r of playRows as Record<string, unknown>[]) {
    const ep = Number(r.episode);
    if (!Number.isFinite(ep) || ep <= 0) continue;
    const row = ensure(ep);
    row.plays = Number(r.plays ?? 0);
    row.completions = Number(r.completions ?? 0);
    row.completionRate = row.plays > 0 ? Math.round((row.completions / row.plays) * 100) : 0;
  }
  for (const r of ratingRows as Record<string, unknown>[]) {
    const ep = Number(r.episode);
    if (!Number.isFinite(ep) || ep <= 0) continue;
    const row = ensure(ep);
    row.avgRating = r.avg_rating != null ? Number(Number(r.avg_rating).toFixed(1)) : null;
    row.ratingCount = Number(r.rating_count ?? 0);
  }
  for (const r of commentRows as Record<string, unknown>[]) {
    const ep = Number(r.episode);
    if (!Number.isFinite(ep) || ep <= 0) continue;
    ensure(ep).comments = Number(r.comment_count ?? 0);
  }

  const episodes = [...byEpisode.values()].sort((a, b) => a.episode - b.episode);

  const mostWatched = episodes.length
    ? episodes.reduce((a, b) => (b.plays > a.plays ? b : a))
    : null;
  const highestRated = episodes.filter((e) => e.ratingCount > 0).length
    ? episodes.filter((e) => e.ratingCount > 0).reduce((a, b) => ((b.avgRating ?? 0) > (a.avgRating ?? 0) ? b : a))
    : null;
  const mostDiscussed = episodes.length
    ? episodes.reduce((a, b) => (b.comments > a.comments ? b : a))
    : null;

  return NextResponse.json({
    episodes,
    highlights: {
      mostWatched: mostWatched && mostWatched.plays > 0 ? mostWatched.episode : null,
      highestRated: highestRated ? highestRated.episode : null,
      mostDiscussed: mostDiscussed && mostDiscussed.comments > 0 ? mostDiscussed.episode : null,
    },
  });
}

export const maxDuration = 15;
