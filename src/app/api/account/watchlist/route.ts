import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { animeReviews, watchlist } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq, and, sql, ilike, desc, asc } from "drizzle-orm";

const VALID_FOLDERS = ["WATCHING", "PLANNING", "COMPLETED", "PAUSED", "DROPPED"];
const VALID_SORTS = ["title", "added", "updated", "score", "rewatches"] as const;

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 250);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const rawSort = searchParams.get("sort") ?? "updated";
  const sort = (VALID_SORTS as readonly string[]).includes(rawSort)
    ? (rawSort as (typeof VALID_SORTS)[number])
    : "updated";
  const search = searchParams.get("search")?.trim();

  const db = getDb();

  const conditions = [eq(watchlist.userId, payload.userId)];
  if (folder && VALID_FOLDERS.includes(folder)) {
    conditions.push(eq(watchlist.folder, folder));
  }
  if (search) {
    conditions.push(ilike(watchlist.animeTitle, `%${search}%`));
  }

  // Map sort param to column and direction
  let orderBy: any;
  switch (sort) {
    case "title":
      orderBy = asc(sql`COALESCE(${watchlist.animeTitle}, '')`);
      break;
    case "added":
      orderBy = desc(watchlist.createdAt);
      break;
    case "updated":
      orderBy = desc(watchlist.updatedAt);
      break;
    case "score":
      orderBy = desc(animeReviews.score);
      break;
    case "rewatches":
      orderBy = desc(watchlist.rewatchCount);
      break;
    default:
      orderBy = desc(watchlist.updatedAt);
  }

  const [items, countResult] = await Promise.all([
    db
      .select({ row: watchlist, score: animeReviews.score })
      .from(watchlist)
      .leftJoin(
        animeReviews,
        and(
          eq(animeReviews.userId, watchlist.userId),
          eq(animeReviews.animeId, watchlist.animeId),
        ),
      )
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(watchlist)
      .where(and(...conditions)),
  ]);

  return NextResponse.json({
    results: items.map(({ row: item, score }) => ({
      animeId: item.animeId,
      folder: item.folder,
      addedAt: item.createdAt?.toISOString(),
      anilistId: item.anilistId,
      malId: item.malId,
      rewatchCount: item.rewatchCount ?? 0,
      score: score ?? null,
      anime: item.animeTitle
        ? {
            title: { english: item.animeTitle, romaji: item.animeTitle },
            cover_image: { large: item.animeThumbnail, extra_large: item.animeThumbnail },
          }
        : null,
    })),
    total: Number(countResult[0]?.count ?? 0),
  });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { animeId, folder, anilistId, malId, animeTitle, animeThumbnail } = body;

    if (!animeId) return NextResponse.json({ error: "animeId is required" }, { status: 400 });

    const f = (folder ?? "WATCHING").toUpperCase();
    if (!VALID_FOLDERS.includes(f))
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

    const db = getDb();

    await db
      .insert(watchlist)
      .values({
        userId: payload.userId,
        animeId,
        folder: f,
        anilistId: anilistId ?? null,
        malId: malId ?? null,
        animeTitle: animeTitle ?? null,
        animeThumbnail: animeThumbnail ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [watchlist.userId, watchlist.animeId],
        set: {
          folder: f,
          anilistId: anilistId ?? null,
          malId: malId ?? null,
          ...(animeTitle ? { animeTitle } : {}),
          ...(animeThumbnail ? { animeThumbnail } : {}),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[watchlist POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
