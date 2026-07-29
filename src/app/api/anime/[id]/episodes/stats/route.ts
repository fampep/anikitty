import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  try {
    const rows = rowsOf(
      await db.execute(sql`
        SELECT
          wp.episode_id,
          COUNT(*)::int AS total_plays,
          COUNT(DISTINCT wp.user_id)::int AS unique_viewers,
          ROUND(100.0 * COUNT(*) FILTER (WHERE wp.current_time >= GREATEST(FLOOR(wp.duration * 0.9), 30)) / GREATEST(COUNT(*), 1), 1) AS completion_rate,
          COALESCE(AVG(wp.current_time) FILTER (WHERE wp.duration > 0), 0)::int AS avg_watch_time,
          COALESCE(AVG(er.score), 0) AS avg_rating,
          COUNT(DISTINCT c.id)::int AS comment_count
        FROM watch_progress wp
        LEFT JOIN episode_ratings er ON er.anime_id = wp.anime_id AND er.episode_number = COALESCE(wp.episode_number, 0)
        LEFT JOIN comments c ON c.anime_id = wp.anime_id AND c.episode_id = wp.episode_id
        WHERE wp.anime_id = ${id}
        GROUP BY wp.episode_id
        ORDER BY wp.episode_id
      `),
    );

    return NextResponse.json(
      rows.map((r) => ({
        episodeId: r.episode_id,
        totalPlays: Number(r.total_plays),
        uniqueViewers: Number(r.unique_viewers),
        completionRate: Number(r.completion_rate),
        avgWatchTime: Number(r.avg_watch_time),
        avgRating: Number(Number(r.avg_rating ?? 0).toFixed(1)),
        commentCount: Number(r.comment_count),
      })),
    );
  } catch (e) {
    console.error("[episode-stats] error:", e);
    return NextResponse.json([]);
  }
}
