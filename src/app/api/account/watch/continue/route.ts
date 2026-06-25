import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq, sql, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const latestPerAnime = searchParams.get("latestPerAnime") === "true";
  const animeIdFilter = searchParams.get("animeId") ?? null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const db = getDb();
  let items: Array<Record<string, unknown>>;

  if (latestPerAnime && !animeIdFilter) {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (anime_id)
        id, user_id, anime_id, episode_id, current_time, duration,
        language, server, anime_title, anime_thumbnail, anilist_id, updated_at
      FROM watch_progress
      WHERE user_id = ${payload.userId}
      ORDER BY anime_id, updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);
    items = result as Array<Record<string, unknown>>;
  } else {
    const conditions = [eq(watchProgress.userId, payload.userId)];
    if (animeIdFilter) {
      conditions.push(eq(watchProgress.animeId, animeIdFilter));
    }
    const rows = await db
      .select()
      .from(watchProgress)
      .where(and(...conditions))
      .orderBy(desc(watchProgress.updatedAt))
      .limit(limit)
      .offset(offset);
    items = rows as Array<Record<string, unknown>>;
  }

  return NextResponse.json({
    data: items.map((r) => ({
      animeId: r.anime_id ?? r.animeId,
      episodeId: r.episode_id ?? r.episodeId,
      currentTime: r.current_time ?? r.currentTime ?? 0,
      duration: r.duration ?? 0,
      language: r.language ?? "sub",
      lastUpdated: typeof r.updated_at === "string"
        ? r.updated_at
        : (r.updated_at as Date)?.toISOString?.() ?? null,
      anime: (r.anime_title ?? r.animeTitle)
        ? {
            title: { english: r.anime_title ?? r.animeTitle, romaji: r.anime_title ?? r.animeTitle },
            cover_image: {
              large: r.anime_thumbnail ?? r.animeThumbnail ?? null,
              extra_large: r.anime_thumbnail ?? r.animeThumbnail ?? null,
            },
          }
        : null,
    })),
    total: items.length,
  });
}
