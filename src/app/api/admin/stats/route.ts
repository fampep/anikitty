import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getSecurityConfigStatus } from "@/lib/security/security";
import { getChatCutoffDate } from "@/lib/social/chat-config";
import { sql } from "drizzle-orm";

const EMPTY_STATS = {
  totalUsers: 0, totalSessions: 0, uniqueAnime: 0, activeToday: 0, activeWeek: 0,
  newUsersWeek: 0, totalComments: 0, totalThreads: 0, anilistLinked: 0,
  totalChatMessages: 0, chatMessagesToday: 0, chatMessagesLive: 0,
  topAnime: [] as unknown[],
};

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
  const db = getDb();
  const chatCutoff = getChatCutoffDate();

  // Each metric is its OWN query: a failure (missing table/column) degrades
  // only that one number to zero instead of zeroing the whole overview.
  const exec = async (q: Parameters<typeof db.execute>[0]): Promise<Record<string, unknown>[]> => {
    try {
      return rowsOf(await db.execute(q));
    } catch (e) {
      console.error("[admin/stats] query failed:", e);
      return [];
    }
  };
  // Scalar count helper — returns the single numeric value or 0 on any failure.
  const count = async (q: Parameters<typeof db.execute>[0]): Promise<number> => {
    const rows = await exec(q);
    const first = rows[0] ?? {};
    const val = (first as Record<string, unknown>).n;
    return Number(val ?? 0);
  };

  const [
    totalUsers, totalSessions, uniqueAnime, activeToday, activeWeek,
    newUsersWeek, totalComments, totalThreads, anilistLinked,
    totalChatMessages, chatMessagesToday, chatMessagesLive, topAnimeResult,
  ] = await Promise.all([
    count(sql`SELECT COUNT(*)::int AS n FROM users`),
    count(sql`SELECT COUNT(*)::int AS n FROM watch_progress`),
    count(sql`SELECT COUNT(DISTINCT anime_id)::int AS n FROM watch_progress`),
    count(sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM watch_progress WHERE updated_at > NOW() - INTERVAL '24 hours'`),
    count(sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM watch_progress WHERE updated_at > NOW() - INTERVAL '7 days'`),
    count(sql`SELECT COUNT(*)::int AS n FROM users WHERE created_at > NOW() - INTERVAL '7 days'`),
    count(sql`SELECT COUNT(*)::int AS n FROM comments`),
    count(sql`SELECT COUNT(*)::int AS n FROM forum_threads`),
    count(sql`SELECT COUNT(*)::int AS n FROM users WHERE anilist_access_token IS NOT NULL`),
    count(sql`SELECT COUNT(*)::int AS n FROM chat_messages`),
    count(sql`SELECT COUNT(*)::int AS n FROM chat_messages WHERE created_at > NOW() - INTERVAL '24 hours'`),
    count(sql`SELECT COUNT(*)::int AS n FROM chat_messages WHERE created_at >= ${chatCutoff}`),
    exec(sql`
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

  const security = getSecurityConfigStatus();

  return NextResponse.json({
    totalUsers,
    totalSessions,
    uniqueAnime,
    activeToday,
    activeWeek,
    newUsersWeek,
    totalComments,
    totalThreads,
    anilistLinked,
    totalChatMessages,
    chatMessagesToday,
    chatMessagesLive,
    security,
    topAnime: topAnimeResult.map((r) => ({
      animeId:        r.anime_id,
      animeTitle:     r.anime_title ?? null,
      animeThumbnail: r.anime_thumbnail ?? null,
      sessionCount:   Number(r.session_count),
      uniqueUsers:    Number(r.unique_users),
    })),
  });
  } catch (e) {
    // Never hard-fail the overview — return a valid (zeroed) payload with the
    // security status so the page still renders and we can see the cause.
    console.error("[admin/stats] failed:", e);
    let security: ReturnType<typeof getSecurityConfigStatus> | null = null;
    try { security = getSecurityConfigStatus(); } catch { /* ignore */ }
    return NextResponse.json({ ...EMPTY_STATS, security });
  }
}

export const maxDuration = 30;
