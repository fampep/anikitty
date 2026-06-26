import type { getDb } from "@/db";
import { sql } from "drizzle-orm";
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

  const idParams = sql.join(unique.map((id) => sql`${id}::uuid`), sql`, `);

  const [watchResult, commentResult] = await Promise.all([
    db.execute(sql`
      SELECT
        user_id,
        COUNT(DISTINCT episode_id)::int AS started,
        COUNT(DISTINCT CASE
          WHEN duration > 0 AND "current_time" >= GREATEST((duration * 0.9)::int, 30)
          THEN episode_id
        END)::int AS completed
      FROM watch_progress
      WHERE user_id IN (${idParams})
      GROUP BY user_id
    `),
    db.execute(sql`
      SELECT user_id, COUNT(*)::int AS comments
      FROM comments
      WHERE user_id IN (${idParams})
      GROUP BY user_id
    `),
  ]);

  const watchRows = watchResult as Record<string, unknown>[];
  const commentRows = commentResult as Record<string, unknown>[];

  const watchMap = new Map(
    watchRows.map((r) => [
      String(r.user_id),
      { started: Number(r.started), completed: Number(r.completed) },
    ]),
  );
  const commentMap = new Map(
    commentRows.map((r) => [String(r.user_id), Number(r.comments)]),
  );

  for (const id of unique) {
    const watch = watchMap.get(id) ?? { started: 0, completed: 0 };
    const comments = commentMap.get(id) ?? 0;
    result.set(id, statsToLevelRole(watch.started, watch.completed, comments));
  }

  return result;
}

export function levelRoleFields(stats: UserXpStats): LevelRoleFields {
  return {
    level: stats.level,
    levelRole: stats.levelRole,
    levelRoleColor: stats.levelRoleColor,
  };
}

export function attachLevelRole<T extends { userId: string }>(
  row: T,
  statsMap: Map<string, UserXpStats>,
): T & LevelRoleFields {
  const stats = statsMap.get(row.userId);
  if (!stats) {
    return { ...row, level: 1, levelRole: "Newcomer", levelRoleColor: "#94a3b8" };
  }
  return { ...row, ...levelRoleFields(stats) };
}
