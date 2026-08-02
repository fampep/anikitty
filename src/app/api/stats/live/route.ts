import { getDb } from "@/db";
import { animeViewEvents, comments, onlineVisitors, users } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats/live — counters for the homepage ticker.
 *
 * Every number here is measured, not estimated: online visitors come from the
 * heartbeat table, the rest are same-day counts. Cached briefly so a busy
 * homepage doesn't turn into four aggregates per visitor.
 */
export async function GET() {
  try {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    // Visitors are considered online if they pinged in the last 5 minutes.
    const onlineSince = new Date(Date.now() - 5 * 60_000);

    const [online, episodesToday, totalUsers, commentsToday] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(onlineVisitors)
        .where(gte(onlineVisitors.lastSeenAt, onlineSince)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(animeViewEvents)
        .where(
          and(
            eq(animeViewEvents.eventType, "view_start"),
            gte(animeViewEvents.createdAt, startOfDay),
          ),
        ),
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(gte(comments.createdAt, startOfDay)),
    ]);

    return Response.json(
      {
        online: online[0]?.count ?? 0,
        episodesToday: episodesToday[0]?.count ?? 0,
        totalUsers: totalUsers[0]?.count ?? 0,
        commentsToday: commentsToday[0]?.count ?? 0,
      },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=15" } },
    );
  } catch {
    return Response.json({
      online: 0,
      episodesToday: 0,
      totalUsers: 0,
      commentsToday: 0,
    });
  }
}
