import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { animeReviews, watchlist } from "@/db/schema";
import {
  mapWatchlistItem,
  WATCHLIST_FOLDERS,
} from "@/lib/watch/watchlist-response";
import { requireVisibleProfileUser } from "@/lib/user/public-profile-access";
import { and, eq, sql, ilike, desc, asc } from "drizzle-orm";

const VALID_SORTS = ["title", "added", "updated", "score", "rewatches"] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const userOrResponse = await requireVisibleProfileUser(req, raw);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const sort = (searchParams.get("sort") ?? "updated") as typeof VALID_SORTS[number];
  const search = searchParams.get("search")?.trim();

  const conditions = [eq(watchlist.userId, userOrResponse.id)];
  if (folder && WATCHLIST_FOLDERS.includes(folder as (typeof WATCHLIST_FOLDERS)[number])) {
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
      .select({ count: sql<number>`count(*)::int` })
      .from(watchlist)
      .where(and(...conditions)),
  ]);

  return NextResponse.json({
    results: items.map((r) => mapWatchlistItem({ ...r.row, score: r.score })),
    total: Number(countResult[0]?.count ?? 0),
  });
}
