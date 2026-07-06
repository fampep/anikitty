import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireVisibleProfileUser } from "@/lib/user/public-profile-access";
import { ACHIEVEMENTS, getUnlockedAchievements } from "@/lib/achievements/achievements";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const userOrResponse = await requireVisibleProfileUser(req, raw);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const db = getDb();
  const [unlocked, streakRow] = await Promise.all([
    getUnlockedAchievements(db, userOrResponse.id),
    db
      .select({ streak: users.loginStreak, longestStreak: users.longestStreak })
      .from(users)
      .where(eq(users.id, userOrResponse.id))
      .limit(1),
  ]);

  const unlockedMap = new Map(unlocked.map((u) => [u.slug, u.unlockedAt]));

  return NextResponse.json({
    achievements: ACHIEVEMENTS.map((a) => ({
      slug: a.slug,
      name: a.name,
      description: a.description,
      icon: a.icon,
      color: a.color,
      category: a.category,
      unlocked: unlockedMap.has(a.slug),
      unlockedAt: unlockedMap.get(a.slug) ?? null,
    })),
    unlockedCount: unlocked.length,
    totalCount: ACHIEVEMENTS.length,
    streak: streakRow[0]?.streak ?? 0,
    longestStreak: streakRow[0]?.longestStreak ?? 0,
  });
}
