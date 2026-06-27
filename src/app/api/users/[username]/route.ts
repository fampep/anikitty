import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { getUserByUsername } from "@/lib/public-user";
import { getUserXpStats } from "@/lib/user-xp";
import { getLevelProgress } from "@/lib/user-level";
import { folderCountsFromRows } from "@/lib/watchlist-response";
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

  const [countRows, stats] = await Promise.all([
    db
      .select({
        folder: watchlist.folder,
        count: sql<number>`count(*)::int`,
      })
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .groupBy(watchlist.folder),
    getUserXpStats(db, user.id),
  ]);

  const levelInfo = getLevelProgress(stats.xp);

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      themeColor: user.themeColor,
      role: user.role,
      roleColor: user.roleColor,
      createdAt: user.createdAt?.toISOString() ?? null,
    },
    counts: folderCountsFromRows(countRows),
    level: {
      xp: stats.xp,
      watchXp: stats.watchXp,
      commentXp: stats.commentXp,
      level: stats.level,
      tier: stats.tier,
      levelRole: stats.levelRole,
      levelRoleColor: stats.levelRoleColor,
      nextTier: levelInfo.nextTier,
      progressPct: levelInfo.progressPct,
      tierProgressPct: levelInfo.tierProgressPct,
      xpInLevel: levelInfo.xpInLevel,
      xpNeededInLevel: levelInfo.xpNeededInLevel,
      xpToNext: levelInfo.xpToNext,
      episodesToNext: levelInfo.xpToNext,
      startedEpisodes: stats.startedEpisodes,
      completedEpisodes: stats.completedEpisodes,
      commentCount: stats.commentCount,
    },
  });
}
