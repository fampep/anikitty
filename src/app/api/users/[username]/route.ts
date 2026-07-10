import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { getUserXpStats } from "@/lib/user/user-xp";
import { getLevelProgress } from "@/lib/user/user-level";
import { folderCountsFromRows } from "@/lib/watch/watchlist-response";
import { getAccountBadgesForUser } from "@/lib/user/account-badges";
import { getFollowSummary } from "@/lib/social/follows";
import { getUserSkipContributionStats } from "@/lib/skip/community-skip-server";
import { hasBlocked } from "@/lib/social/blocks";
import {
  publicUserFields,
  resolveVisibleProfileUser,
} from "@/lib/user/public-profile-access";
import { eq, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const resolved = await resolveVisibleProfileUser(req, raw);
  if (!resolved.ok) return resolved.response;

  const { user, viewerId } = resolved;
  const db = getDb();

  const [countRows, stats, accountBadges, follow, skipContributions] = await Promise.all([
    db
      .select({
        folder: watchlist.folder,
        count: sql<number>`count(*)::int`,
      })
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .groupBy(watchlist.folder),
    getUserXpStats(db, user.id),
    getAccountBadgesForUser(db, user.id),
    getFollowSummary(db, user.id, viewerId),
    getUserSkipContributionStats(db, user.id),
  ]);

  const levelInfo = getLevelProgress(stats.xp);
  const blocked = viewerId && viewerId !== user.id ? await hasBlocked(db, viewerId, user.id) : false;

  return NextResponse.json({
    user: publicUserFields(user, viewerId),
    accountBadges,
    counts: folderCountsFromRows(countRows),
    follow,
    blocked,
    skipContributions: skipContributions.approved > 0 ? skipContributions : null,
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
