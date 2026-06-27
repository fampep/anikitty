import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { getUserByUsername } from "@/lib/public-user";
import {
  mapWatchlistItem,
  WATCHLIST_FOLDERS,
} from "@/lib/watchlist-response";
import { and, eq, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const user = await getUserByUsername(db, username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder")?.toUpperCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const conditions = [eq(watchlist.userId, user.id)];
  if (folder && WATCHLIST_FOLDERS.includes(folder as (typeof WATCHLIST_FOLDERS)[number])) {
    conditions.push(eq(watchlist.folder, folder));
  }

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(watchlist)
      .where(and(...conditions))
      .orderBy(sql`${watchlist.updatedAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(watchlist)
      .where(and(...conditions)),
  ]);

  return NextResponse.json({
    results: items.map(mapWatchlistItem),
    total: Number(countResult[0]?.count ?? 0),
  });
}
