import type { getDb } from "@/db";
import { animeReviews, userAchievements, userFollows, users, watchlist } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUserXpStats } from "@/lib/user/user-xp";
import { grantKittycoins } from "@/lib/shop/kittycoins";

type Db = ReturnType<typeof getDb>;

/** Metrics an achievement can be measured against. */
export type AchievementStats = {
  episodesCompleted: number;
  episodesStarted: number;
  comments: number;
  reviews: number;
  level: number;
  longestStreak: number;
  watchlist: number;
  following: number;
};

export type AchievementCategory = "watching" | "community" | "progression" | "loyalty";

export type Achievement = {
  slug: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // hex
  category: AchievementCategory;
  metric: keyof AchievementStats;
  threshold: number;
  reward: number; // kittycoins granted on unlock
};

/** Static achievement catalog. Slugs are stable — never rename an unlocked one. */
export const ACHIEVEMENTS: Achievement[] = [
  // Watching
  { slug: "first-episode", name: "First Steps", description: "Finish your first episode.", icon: "Play", color: "#60a5fa", category: "watching", metric: "episodesCompleted", threshold: 1, reward: 20 },
  { slug: "ten-episodes", name: "Getting Hooked", description: "Finish 10 episodes.", icon: "Tv", color: "#22d3ee", category: "watching", metric: "episodesCompleted", threshold: 10, reward: 25 },
  { slug: "hundred-episodes", name: "Binge Machine", description: "Finish 100 episodes.", icon: "Flame", color: "#c084fc", category: "watching", metric: "episodesCompleted", threshold: 100, reward: 75 },
  { slug: "fivehundred-episodes", name: "No Life", description: "Finish 500 episodes.", icon: "Zap", color: "#a78bfa", category: "watching", metric: "episodesCompleted", threshold: 500, reward: 200 },
  { slug: "list-builder", name: "Curator", description: "Add 10 titles to your lists.", icon: "BookMarked", color: "#34d399", category: "watching", metric: "watchlist", threshold: 10, reward: 25 },
  { slug: "list-master", name: "Archivist", description: "Add 50 titles to your lists.", icon: "Library", color: "#2dd4bf", category: "watching", metric: "watchlist", threshold: 50, reward: 75 },
  // Community
  { slug: "first-comment", name: "Say Hi", description: "Post your first comment.", icon: "MessageCircle", color: "#818cf8", category: "community", metric: "comments", threshold: 1, reward: 20 },
  { slug: "fifty-comments", name: "Chatterbox", description: "Post 50 comments.", icon: "MessagesSquare", color: "#f472b6", category: "community", metric: "comments", threshold: 50, reward: 75 },
  { slug: "first-review", name: "Critic", description: "Write your first review.", icon: "Star", color: "#fbbf24", category: "community", metric: "reviews", threshold: 1, reward: 25 },
  { slug: "ten-reviews", name: "Connoisseur", description: "Write 10 reviews.", icon: "Award", color: "#f59e0b", category: "community", metric: "reviews", threshold: 10, reward: 100 },
  { slug: "social", name: "Socialite", description: "Follow 5 other users.", icon: "Users", color: "#38bdf8", category: "community", metric: "following", threshold: 5, reward: 25 },
  // Progression
  { slug: "level-10", name: "Rising Star", description: "Reach level 10.", icon: "TrendingUp", color: "#34d399", category: "progression", metric: "level", threshold: 10, reward: 30 },
  { slug: "level-25", name: "Seasoned", description: "Reach level 25.", icon: "Gem", color: "#6366f1", category: "progression", metric: "level", threshold: 25, reward: 60 },
  { slug: "level-50", name: "Elite", description: "Reach level 50.", icon: "Swords", color: "#d946ef", category: "progression", metric: "level", threshold: 50, reward: 120 },
  { slug: "level-100", name: "Kage", description: "Reach level 100.", icon: "Crown", color: "#fbbf24", category: "progression", metric: "level", threshold: 100, reward: 300 },
  // Loyalty
  { slug: "streak-7", name: "Regular", description: "Log in 7 days in a row.", icon: "CalendarCheck", color: "#fb923c", category: "loyalty", metric: "longestStreak", threshold: 7, reward: 40 },
  { slug: "streak-30", name: "Devoted", description: "Log in 30 days in a row.", icon: "CalendarHeart", color: "#f43f5e", category: "loyalty", metric: "longestStreak", threshold: 30, reward: 150 },
  // High-tier episode milestones
  { slug: "thousand-episodes", name: "Veteran", description: "Finish 1,000 episodes.", icon: "Swords", color: "#f97316", category: "watching", metric: "episodesCompleted", threshold: 1000, reward: 500 },
  { slug: "five-thousand-episodes", name: "Marathoner", description: "Finish 5,000 episodes.", icon: "Rocket", color: "#e879f9", category: "watching", metric: "episodesCompleted", threshold: 5000, reward: 1500 },
  { slug: "ten-thousand-episodes", name: "Transcendent", description: "Finish 10,000 episodes.", icon: "Atom", color: "#f43f5e", category: "watching", metric: "episodesCompleted", threshold: 10000, reward: 5000 },
];

export const ACHIEVEMENTS_BY_SLUG = new Map(ACHIEVEMENTS.map((a) => [a.slug, a]));

export function isAchievementEarned(a: Achievement, stats: AchievementStats): boolean {
  return stats[a.metric] >= a.threshold;
}

/** Gather every metric an achievement might be measured against, in one place. */
export async function getAchievementStats(db: Db, userId: string): Promise<AchievementStats> {
  const [xp, reviewRow, watchRow, followRow, streakRow] = await Promise.all([
    getUserXpStats(db, userId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(animeReviews)
      .where(eq(animeReviews.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(watchlist)
      .where(eq(watchlist.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId)),
    db
      .select({ longest: users.longestStreak })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  return {
    episodesCompleted: xp.completedEpisodes,
    episodesStarted: xp.startedEpisodes,
    comments: xp.commentCount,
    reviews: reviewRow[0]?.count ?? 0,
    level: xp.level,
    longestStreak: streakRow[0]?.longest ?? 0,
    watchlist: watchRow[0]?.count ?? 0,
    following: followRow[0]?.count ?? 0,
  };
}

export type AchievementProgress = Achievement & {
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
};

export type AchievementsResult = {
  stats: AchievementStats;
  achievements: AchievementProgress[];
  unlockedCount: number;
  totalCount: number;
  newlyUnlocked: string[];
};

/**
 * Evaluate all achievements for a user, unlock any newly-earned ones (granting
 * their reward), and return the full progress list. Pass `unlock: false` for a
 * read-only view (e.g. someone else's profile).
 */
export async function evaluateAchievements(
  db: Db,
  userId: string,
  opts: { unlock?: boolean } = {},
): Promise<AchievementsResult> {
  const unlock = opts.unlock ?? true;
  const stats = await getAchievementStats(db, userId);

  const unlockedRows = await db
    .select({ slug: userAchievements.slug, unlockedAt: userAchievements.unlockedAt })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const unlockedMap = new Map(unlockedRows.map((r) => [r.slug, r.unlockedAt]));

  const newlyUnlocked: string[] = [];

  if (unlock) {
    const toUnlock = ACHIEVEMENTS.filter(
      (a) => !unlockedMap.has(a.slug) && isAchievementEarned(a, stats),
    );
    if (toUnlock.length > 0) {
      const now = new Date();
      const inserted = await db
        .insert(userAchievements)
        .values(toUnlock.map((a) => ({ userId, slug: a.slug, unlockedAt: now })))
        .onConflictDoNothing()
        .returning({ slug: userAchievements.slug });
      for (const row of inserted) {
        newlyUnlocked.push(row.slug);
        unlockedMap.set(row.slug, now);
        const ach = ACHIEVEMENTS_BY_SLUG.get(row.slug);
        if (ach && ach.reward > 0) {
          void grantKittycoins(db, userId, ach.reward, "achievement", row.slug);
        }
      }
    }
  }

  const achievements: AchievementProgress[] = ACHIEVEMENTS.map((a) => {
    const at = unlockedMap.get(a.slug);
    return {
      ...a,
      unlocked: unlockedMap.has(a.slug),
      unlockedAt: at ? new Date(at).toISOString() : null,
      current: Math.min(stats[a.metric], a.threshold),
    };
  });

  return {
    stats,
    achievements,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
    totalCount: ACHIEVEMENTS.length,
    newlyUnlocked,
  };
}

/** Read-only unlocked list for a public profile (no side effects). */
export async function getUnlockedAchievements(
  db: Db,
  userId: string,
): Promise<{ slug: string; unlockedAt: string | null }[]> {
  const rows = await db
    .select({ slug: userAchievements.slug, unlockedAt: userAchievements.unlockedAt })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  return rows
    .filter((r) => ACHIEVEMENTS_BY_SLUG.has(r.slug))
    .map((r) => ({ slug: r.slug, unlockedAt: r.unlockedAt ? new Date(r.unlockedAt).toISOString() : null }));
}
