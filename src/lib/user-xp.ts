import type { getDb } from "@/db";
import { comments, watchProgress } from "@/db/schema";
import { inArray, sql } from "drizzle-orm";
import {
  computeTotalXp,
  getLevelProgress,
  COMMENT_XP,
  type LevelTier,
} from "@/lib/user-level";

type Db = ReturnType<typeof getDb>;

export type UserXpStats = {
  startedEpisodes: number;
  completedEpisodes: number;
  commentCount: number;
  watchXp: number;
  commentXp: number;
  xp: number;
  level: number;
  tier: LevelTier;
  levelRole: string;
  levelRoleColor: string;
};

export type LevelRoleFields = {
  level: number;
  levelRole: string;
  levelRoleColor: string;
  levelTierIcon: string;
};

function statsToLevelRole(
  started: number,
  completed: number,
  commentCount: number,
): UserXpStats {
  const watchXp =
    completed + Math.floor(Math.max(0, started - completed) * 0.25);
  const commentXp = commentCount * COMMENT_XP;
  const xp = computeTotalXp(started, completed, commentCount);
  const info = getLevelProgress(xp);
  return {
    startedEpisodes: started,
    completedEpisodes: completed,
    commentCount,
    watchXp,
    commentXp,
    xp,
    level: info.level,
    tier: info.tier,
    levelRole: info.tier.name,
    levelRoleColor: info.tier.color,
  };
}

export async function getUserXpStats(
  db: Db,
  userId: string,
): Promise<UserXpStats> {
  const map = await getUsersXpStats(db, [userId]);
  return map.get(userId) ?? statsToLevelRole(0, 0, 0);
}

export async function getUsersXpStats(
  db: Db,
  userIds: string[],
): Promise<Map<string, UserXpStats>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const result = new Map<string, UserXpStats>();
  if (unique.length === 0) return result;

  const [watchRows, commentRows] = await Promise.all([
    db
      .select({
        userId: watchProgress.userId,
        started: sql<number>`count(distinct ${watchProgress.episodeId})::int`.as(
          "started",
        ),
        completed: sql<number>`count(distinct case
          when ${watchProgress.duration} > 0
            and ${watchProgress.currentTime} >= greatest((${watchProgress.duration} * 0.9)::int, 30)
          then ${watchProgress.episodeId}
        end)::int`.as("completed"),
      })
      .from(watchProgress)
      .where(inArray(watchProgress.userId, unique))
      .groupBy(watchProgress.userId),
    db
      .select({
        userId: comments.userId,
        commentCount: sql<number>`count(*)::int`.as("comments"),
      })
      .from(comments)
      .where(inArray(comments.userId, unique))
      .groupBy(comments.userId),
  ]);

  const watchMap = new Map(
    watchRows.map((r) => [
      r.userId,
      { started: r.started, completed: r.completed },
    ]),
  );
  const commentMap = new Map(
    commentRows.map((r) => [r.userId, r.commentCount]),
  );

  for (const id of unique) {
    const watch = watchMap.get(id) ?? { started: 0, completed: 0 };
    const commentCount = commentMap.get(id) ?? 0;
    result.set(id, statsToLevelRole(watch.started, watch.completed, commentCount));
  }

  return result;
}

export function levelRoleFields(stats: UserXpStats): LevelRoleFields {
  return {
    level: stats.level,
    levelRole: stats.levelRole,
    levelRoleColor: stats.levelRoleColor,
    levelTierIcon: stats.tier.icon,
  };
}

export function attachLevelRole<T extends { userId: string }>(
  row: T,
  statsMap: Map<string, UserXpStats>,
): T & LevelRoleFields {
  const stats = statsMap.get(row.userId);
  if (!stats) {
    return {
      ...row,
      level: 1,
      levelRole: "Newcomer",
      levelRoleColor: "#94a3b8",
      levelTierIcon: "Eye",
    };
  }
  return { ...row, ...levelRoleFields(stats) };
}
