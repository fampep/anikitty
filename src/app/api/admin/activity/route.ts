import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const view = searchParams.get("view") ?? "feed"; // "feed" | "live"

  const db = getDb();

  if (view === "live") {
    // One row per user — their most recent session
    const result = await db.execute(sql`
      SELECT * FROM (
        SELECT DISTINCT ON (wp.user_id)
          wp.id              AS "progressId",
          wp.anime_id        AS "animeId",
          wp.episode_id      AS "episodeId",
          wp.current_time    AS "currentTime",
          wp.duration,
          wp.language,
          wp.server,
          wp.anime_title     AS "animeTitle",
          wp.anime_thumbnail AS "animeThumbnail",
          wp.updated_at      AS "updatedAt",
          u.id               AS "userId",
          u.username,
          u.avatar_url       AS "avatarUrl",
          u.role             AS "userRole"
        FROM watch_progress wp
        INNER JOIN users u ON wp.user_id = u.id
        ORDER BY wp.user_id, wp.updated_at DESC
      ) t
      ORDER BY t."updatedAt" DESC
      LIMIT ${limit}
    `);
    return NextResponse.json({ activity: result });
  }

  // Default feed view: all recent sessions
  const rows = await db
    .select({
      progressId:     watchProgress.id,
      animeId:        watchProgress.animeId,
      episodeId:      watchProgress.episodeId,
      currentTime:    watchProgress.currentTime,
      duration:       watchProgress.duration,
      language:       watchProgress.language,
      server:         watchProgress.server,
      animeTitle:     watchProgress.animeTitle,
      animeThumbnail: watchProgress.animeThumbnail,
      updatedAt:      watchProgress.updatedAt,
      userId:         users.id,
      username:       users.username,
      avatarUrl:      users.avatarUrl,
      userRole:       users.role,
    })
    .from(watchProgress)
    .innerJoin(users, eq(watchProgress.userId, users.id))
    .orderBy(desc(watchProgress.updatedAt))
    .limit(limit);

  return NextResponse.json({ activity: rows });
}
