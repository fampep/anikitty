import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { getUserXpStats } from "@/lib/user/user-xp";
import { getLevelProgress } from "@/lib/user/user-level";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const stats = await getUserXpStats(db, payload.userId);
  const info = getLevelProgress(stats.xp);

  return NextResponse.json({
    xp: stats.xp,
    watchXp: stats.watchXp,
    commentXp: stats.commentXp,
    discordXp: stats.discordXp,
    level: info.level,
    tier: info.tier,
    levelRole: stats.levelRole,
    levelRoleColor: stats.levelRoleColor,
    nextTier: info.nextTier,
    progressPct: info.progressPct,
    tierProgressPct: info.tierProgressPct,
    xpInLevel: info.xpInLevel,
    xpNeededInLevel: info.xpNeededInLevel,
    xpToNext: info.xpToNext,
    episodesToNext: info.xpToNext,
    startedEpisodes: stats.startedEpisodes,
    completedEpisodes: stats.completedEpisodes,
    commentCount: stats.commentCount,
  });
}
