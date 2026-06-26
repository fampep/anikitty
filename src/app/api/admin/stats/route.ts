import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { getSecurityConfigStatus } from "@/lib/security";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();

  const [totalsResult, topAnimeResult] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users)::int                                                                          AS total_users,
        (SELECT COUNT(*) FROM watch_progress)::int                                                                AS total_sessions,
        (SELECT COUNT(DISTINCT anime_id) FROM watch_progress)::int                                                AS unique_anime,
        (SELECT COUNT(DISTINCT user_id) FROM watch_progress WHERE updated_at > NOW() - INTERVAL '24 hours')::int  AS active_today,
        (SELECT COUNT(DISTINCT user_id) FROM watch_progress WHERE updated_at > NOW() - INTERVAL '7 days')::int   AS active_week,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days')::int                           AS new_users_week,
        (SELECT COUNT(*) FROM comments)::int                                                                      AS total_comments,
        (SELECT COUNT(*) FROM forum_threads)::int                                                                 AS total_threads,
        (SELECT COUNT(*) FROM users WHERE anilist_access_token IS NOT NULL)::int                                  AS anilist_linked
    `),
    db.execute(sql`
      SELECT
        anime_id,
        anime_title,
        anime_thumbnail,
        COUNT(*)::int            AS session_count,
        COUNT(DISTINCT user_id)::int AS unique_users
      FROM watch_progress
      WHERE anime_title IS NOT NULL
      GROUP BY anime_id, anime_title, anime_thumbnail
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `),
  ]);

  const t = (totalsResult as Record<string, unknown>[])[0] ?? {};
  const security = getSecurityConfigStatus();

  return NextResponse.json({
    totalUsers:    Number(t.total_users    ?? 0),
    totalSessions: Number(t.total_sessions ?? 0),
    uniqueAnime:   Number(t.unique_anime   ?? 0),
    activeToday:   Number(t.active_today   ?? 0),
    activeWeek:    Number(t.active_week    ?? 0),
    newUsersWeek:  Number(t.new_users_week ?? 0),
    totalComments: Number(t.total_comments ?? 0),
    totalThreads:  Number(t.total_threads  ?? 0),
    anilistLinked: Number(t.anilist_linked ?? 0),
    security,
    topAnime: (topAnimeResult as Record<string, unknown>[]).map((r) => ({
      animeId:        r.anime_id,
      animeTitle:     r.anime_title ?? null,
      animeThumbnail: r.anime_thumbnail ?? null,
      sessionCount:   Number(r.session_count),
      uniqueUsers:    Number(r.unique_users),
    })),
  });
}
