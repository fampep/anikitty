import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

export async function computeDailyRollup(date: string): Promise<void> {
  const db = getDb();
  const dayStart = `${date} 00:00:00`;
  const dayEnd = `${date} 23:59:59`;

  const count = async (q: Parameters<typeof db.execute>[0]): Promise<number> => {
    try {
      const rows = rowsOf(await db.execute(q));
      return Number((rows[0] as Record<string, unknown>)?.n ?? 0);
    } catch {
      return 0;
    }
  };

  const [totalViews, uniqueViewers, episodesCompleted, newUsers, totalWatchMinutes, activeUsers] =
    await Promise.all([
      count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE event_type = 'view_start' AND created_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
      count(sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM anime_view_events WHERE created_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
      count(sql`SELECT COUNT(*)::int AS n FROM anime_view_events WHERE event_type = 'view_complete' AND created_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
      count(sql`SELECT COUNT(*)::int AS n FROM users WHERE created_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
      count(sql`SELECT COALESCE(SUM(watch_time_seconds) / 60, 0)::int AS n FROM anime_view_events WHERE created_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
      count(sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM watch_progress WHERE updated_at BETWEEN ${dayStart}::timestamp AND ${dayEnd}::timestamp`),
    ]);

  await db.execute(sql`
    INSERT INTO daily_stats (date, total_views, unique_viewers, episodes_completed, new_users, total_watch_minutes, active_users)
    VALUES (${date}, ${totalViews}, ${uniqueViewers}, ${episodesCompleted}, ${newUsers}, ${totalWatchMinutes}, ${activeUsers})
    ON CONFLICT (date) DO UPDATE SET
      total_views = EXCLUDED.total_views,
      unique_viewers = EXCLUDED.unique_viewers,
      episodes_completed = EXCLUDED.episodes_completed,
      new_users = EXCLUDED.new_users,
      total_watch_minutes = EXCLUDED.total_watch_minutes,
      active_users = EXCLUDED.active_users
  `);
}
