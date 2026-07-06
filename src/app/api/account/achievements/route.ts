import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { evaluateAchievements } from "@/lib/achievements/achievements";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const db = getDb();
  const [result, streakRow] = await Promise.all([
    evaluateAchievements(db, user.id, { unlock: true }),
    db
      .select({
        streak: users.loginStreak,
        longestStreak: users.longestStreak,
        lastLoginDate: users.lastLoginDate,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  ]);

  return NextResponse.json({
    ...result,
    streak: streakRow[0]?.streak ?? 0,
    longestStreak: streakRow[0]?.longestStreak ?? 0,
    lastLoginDate: streakRow[0]?.lastLoginDate ?? null,
  });
}
