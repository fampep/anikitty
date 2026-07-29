import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const count = async (q: Parameters<typeof db.execute>[0]): Promise<number> => {
    try {
      const rows = rowsOf(await db.execute(q));
      return Number((rows[0] as Record<string, unknown>)?.n ?? 0);
    } catch {
      return 0;
    }
  };

  const [
    totalViews,
    watchStarts,
    completions,
    favorites,
    avgRating,
    viewsToday,
    viewsWeek,
    viewsMonth,
    totalWatchSeconds,
    uniqueViewers,
    rewatchCount,
  ] = await Promise.all([
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id}`),
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id} AND event_type = 'view_start'`),
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id} AND event_type = 'view_complete'`),
    count(sql`SELECT COUNT(*)::int AS n FROM watchlist WHERE anime_id = ${id} AND folder = 'FAVORITES'`),
    (async () => {
      try {
        const rows = rowsOf(await db.execute(sql`SELECT COALESCE(AVG(score), 0) AS n FROM anime_reviews WHERE anime_id = ${id}`));
        return Number(Number((rows[0] as Record<string, unknown>)?.n ?? 0).toFixed(1));
      } catch { return 0; }
    })(),
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id} AND created_at > NOW() - INTERVAL '24 hours'`),
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id} AND created_at > NOW() - INTERVAL '7 days'`),
    count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE anime_id = ${id} AND created_at > NOW() - INTERVAL '30 days'`),
    count(sql`SELECT COALESCE(SUM(watch_time_seconds), 0)::int AS n FROM anime_view_events WHERE anime_id = ${id}`),
    count(sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM watch_progress WHERE anime_id = ${id}`),
    count(sql`SELECT COALESCE(SUM(rewatch_count), 0)::int AS n FROM watchlist WHERE anime_id = ${id}`),
  ]);

  const trendingScore = Math.round(
    viewsToday * 5 + viewsWeek * 2 + completions * 3 + favorites * 10 + avgRating * 5,
  );

  return NextResponse.json({
    totalViews,
    watchStarts,
    completions,
    favorites,
    avgRating,
    trendingScore,
    viewsToday,
    viewsWeek,
    viewsMonth,
    totalWatchTime: totalWatchSeconds,
    uniqueViewers,
    rewatchCount,
  });
}

export const maxDuration = 15;
