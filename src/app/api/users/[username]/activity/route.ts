import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { requireVisibleProfileUser } from "@/lib/public-profile-access";
import { eq, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const userOrResponse = await requireVisibleProfileUser(req, raw);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const db = getDb();
  const rows = await db
    .select({
      date: sql<string>`date(${watchProgress.updatedAt})`.as("date"),
      count: sql<number>`count(distinct ${watchProgress.episodeId})::int`.as("count"),
    })
    .from(watchProgress)
    .where(eq(watchProgress.userId, userOrResponse.id))
    .groupBy(sql`date(${watchProgress.updatedAt})`);

  const activity = rows
    .filter((r) => r.date)
    .map((r) => ({ date: String(r.date), count: r.count }));

  const totalCount = activity.reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({ activity, totalCount });
}
