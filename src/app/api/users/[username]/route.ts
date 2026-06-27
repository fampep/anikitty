import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { getUserXpStats } from "@/lib/user-xp";
import { getLevelProgress } from "@/lib/user-level";
import { folderCountsFromRows } from "@/lib/watchlist-response";
import {
  publicUserFields,
  resolveVisibleProfileUser,
} from "@/lib/public-profile-access";
import { eq, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const resolved = await resolveVisibleProfileUser(req, raw);
  if (!resolved.ok) return resolved.response;

  const { user } = resolved;
  const db = getDb();

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
    user: publicUserFields(user),
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
