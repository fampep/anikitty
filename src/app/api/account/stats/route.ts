import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserXpStats } from "@/lib/user/user-xp";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const uid = payload.userId;

  const count = async (q: Parameters<typeof db.execute>[0]): Promise<number> => {
    try {
      const rows = rowsOf(await db.execute(q));
      return Number((rows[0] as Record<string, unknown>)?.n ?? 0);
    } catch { return 0; }
  };

  const [xp, moviesWatched, animeCompleted, totalWatchSeconds, avgRating, watchStreak, longestStreak, favoriteGenre] =
    await Promise.all([
      getUserXpStats(db, uid),
      count(sql`SELECT COUNT(DISTINCT anime_id)::int AS n FROM watch_progress WHERE user_id = ${uid}::uuid AND duration > 3600`),
      count(sql`SELECT COUNT(*)::int AS n FROM watchlist WHERE user_id = ${uid}::uuid AND folder = 'COMPLETED'`),
      count(sql`SELECT COALESCE(SUM(LEAST(current_time, duration)), 0)::int AS n FROM watch_progress WHERE user_id = ${uid}::uuid`),
      (async () => {
        try {
          const rows = rowsOf(await db.execute(sql`SELECT COALESCE(AVG(score), 0) AS n FROM anime_reviews WHERE user_id = ${uid}::uuid`));
          return Number(Number((rows[0] as Record<string, unknown>)?.n ?? 0).toFixed(1));
        } catch { return 0; }
      })(),
      count(sql`
        SELECT COUNT(DISTINCT DATE(updated_at))::int AS n
        FROM watch_progress
        WHERE user_id = ${uid}::uuid
          AND updated_at > NOW() - INTERVAL '30 days'
      `),
      count(sql`SELECT COALESCE(longest_streak, 0)::int AS n FROM users WHERE id = ${uid}::uuid`),
      (async () => {
        try {
          const rows = rowsOf(await db.execute(sql`
            SELECT anime_id, COUNT(*)::int AS cnt
            FROM watch_progress
            WHERE user_id = ${uid}::uuid
            GROUP BY anime_id
            ORDER BY cnt DESC
            LIMIT 1
          `));
          return rows[0]?.anime_id ? String(rows[0].anime_id) : null;
        } catch { return null; }
      })(),
    ]);

  const totalWatchHours = Math.round(totalWatchSeconds / 3600 * 10) / 10;
  const activeDays = watchStreak || 1;
  const avgDailyHours = Math.round((totalWatchHours / activeDays) * 10) / 10;

  return NextResponse.json({
    episodesWatched: xp.startedEpisodes,
    episodesCompleted: xp.completedEpisodes,
    moviesWatched,
    animeCompleted,
    totalWatchHours,
    avgDailyWatchHours: avgDailyHours,
    currentWatchStreak: watchStreak,
    longestWatchStreak: longestStreak,
    avgRatingGiven: avgRating,
    favoriteAnimeId: favoriteGenre,
    level: xp.level,
    xp: xp.xp,
    tier: xp.tier,
  });
}
