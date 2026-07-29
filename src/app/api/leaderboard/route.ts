import { NextResponse } from "next/server";
import { getDb, rowsOf } from "@/db";
import { sql } from "drizzle-orm";

const VALID_METRICS = ["episodes", "completed", "watchTime", "streak", "reviews"] as const;
const VALID_PERIODS = ["weekly", "monthly", "yearly", "all"] as const;

function periodFilter(period: string): string {
  switch (period) {
    case "weekly": return "AND wp.updated_at > NOW() - INTERVAL '7 days'";
    case "monthly": return "AND wp.updated_at > NOW() - INTERVAL '30 days'";
    case "yearly": return "AND wp.updated_at > NOW() - INTERVAL '365 days'";
    default: return "";
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") || "episodes";
  const period = searchParams.get("period") || "all";
  const limit = Math.min(Number(searchParams.get("limit") || "25"), 100);

  if (!VALID_METRICS.includes(metric as typeof VALID_METRICS[number]))
    return NextResponse.json({ error: "Invalid metric" }, { status: 400 });

  const db = getDb();
  const pf = periodFilter(period);

  try {
    let query: Parameters<typeof db.execute>[0];

    if (metric === "episodes") {
      query = sql.raw(`
        SELECT u.id, u.username, u.avatar_url, u.role,
          COUNT(*)::int AS value
        FROM watch_progress wp
        JOIN users u ON u.id = wp.user_id
        WHERE wp.duration > 0 AND wp.current_time >= GREATEST(FLOOR(wp.duration * 0.9), 30) ${pf}
        GROUP BY u.id, u.username, u.avatar_url, u.role
        ORDER BY value DESC
        LIMIT ${limit}
      `);
    } else if (metric === "completed") {
      query = sql.raw(`
        SELECT u.id, u.username, u.avatar_url, u.role,
          COUNT(*)::int AS value
        FROM watchlist wl
        JOIN users u ON u.id = wl.user_id
        WHERE wl.folder = 'COMPLETED'
        GROUP BY u.id, u.username, u.avatar_url, u.role
        ORDER BY value DESC
        LIMIT ${limit}
      `);
    } else if (metric === "watchTime") {
      query = sql.raw(`
        SELECT u.id, u.username, u.avatar_url, u.role,
          COALESCE(SUM(LEAST(wp.current_time, wp.duration)), 0)::int AS value
        FROM watch_progress wp
        JOIN users u ON u.id = wp.user_id
        WHERE wp.duration > 0 ${pf}
        GROUP BY u.id, u.username, u.avatar_url, u.role
        ORDER BY value DESC
        LIMIT ${limit}
      `);
    } else if (metric === "streak") {
      query = sql.raw(`
        SELECT id, username, avatar_url, role,
          COALESCE(longest_streak, 0)::int AS value
        FROM users
        WHERE longest_streak > 0
        ORDER BY longest_streak DESC
        LIMIT ${limit}
      `);
    } else {
      query = sql.raw(`
        SELECT u.id, u.username, u.avatar_url, u.role,
          COUNT(*)::int AS value
        FROM anime_reviews ar
        JOIN users u ON u.id = ar.user_id
        GROUP BY u.id, u.username, u.avatar_url, u.role
        ORDER BY value DESC
        LIMIT ${limit}
      `);
    }

    const rows = rowsOf(await db.execute(query));
    const entries = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      username: r.username,
      avatarUrl: r.avatar_url ?? null,
      role: r.role,
      value: Number(r.value),
    }));

    return NextResponse.json({ metric, period, entries });
  } catch (e) {
    console.error("[leaderboard] error:", e);
    return NextResponse.json({ metric, period, entries: [] });
  }
}
