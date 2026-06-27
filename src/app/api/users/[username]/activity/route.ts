import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { getUserByUsername } from "@/lib/public-user";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _req: Request,
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

  const rows = await db
    .select({
      date: sql<string>`date(${watchProgress.updatedAt})`.as("date"),
      count: sql<number>`count(distinct ${watchProgress.episodeId})::int`.as("count"),
    })
    .from(watchProgress)
    .where(eq(watchProgress.userId, user.id))
    .groupBy(sql`date(${watchProgress.updatedAt})`);

  const activity = rows
    .filter((r) => r.date)
    .map((r) => ({ date: String(r.date), count: r.count }));

  const totalCount = activity.reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({ activity, totalCount });
}
