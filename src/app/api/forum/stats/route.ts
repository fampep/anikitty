import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  const [totalsResult, categoryResult] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM forum_threads)::int AS total_threads,
        (SELECT COUNT(*) FROM forum_posts)::int AS total_replies,
        (SELECT COUNT(*) FROM forum_threads
          WHERE last_activity_at > NOW() - INTERVAL '24 hours')::int AS active_today
    `),
    db.execute(sql`
      SELECT category, COUNT(*)::int AS count
      FROM forum_threads
      GROUP BY category
    `),
  ]);

  const totals = rowsOf(totalsResult)[0] ?? {};
  const categoryRows = rowsOf(categoryResult);

  const categoryCounts: Record<string, number> = {};
  for (const row of categoryRows) {
    categoryCounts[String(row.category)] = Number(row.count);
  }

  return Response.json({
    totalThreads: Number(totals.total_threads ?? 0),
    totalReplies: Number(totals.total_replies ?? 0),
    activeToday: Number(totals.active_today ?? 0),
    categoryCounts,
  });
}
