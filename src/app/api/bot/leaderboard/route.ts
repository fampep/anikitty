import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb, rowsOf } from "@/db";
import { users } from "@/db/schema";
import { getUsersXpStats } from "@/lib/user/user-xp";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { siteBase } from "@/lib/bot/bot-anime-payload";
import { ROUTES } from "@/constants/routes";

/**
 * GET /api/bot/leaderboard?limit=10
 * Top AniKitty accounts by total XP (watch + comments + Discord chat).
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") || "10", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(25, Math.max(1, limitRaw))
    : 10;

  if (!process.env.DATABASE_URL) {
    return Response.json({ count: 0, entries: [] });
  }

  try {
    const db = getDb();

    // Users with any XP source (avoids scanning every account).
    const activeRows = rowsOf<{ user_id: string }>(
      await db.execute(sql`
        SELECT DISTINCT uid AS user_id FROM (
          SELECT user_id AS uid FROM watch_progress
          UNION
          SELECT user_id AS uid FROM comments
          UNION
          SELECT user_id AS uid FROM discord_chat_xp WHERE xp > 0
        ) active
      `),
    );
    const idList = activeRows.map((r) => r.user_id).filter(Boolean);

    if (idList.length === 0) {
      return Response.json({ count: 0, entries: [] });
    }

    const candidates = await db
      .select({
        id: users.id,
        username: users.username,
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(and(inArray(users.id, idList), isNull(users.bannedAt)));

    const statsMap = await getUsersXpStats(
      db,
      candidates.map((u) => u.id),
    );

    const ranked = candidates
      .map((u) => {
        const stats = statsMap.get(u.id);
        return {
          siteUsername: u.username,
          discordId: u.discordId ?? null,
          discordUsername: u.discordUsername ?? null,
          avatarUrl: u.avatarUrl ?? null,
          profileUrl: `${siteBase()}${ROUTES.profile(u.username)}`,
          xp: stats?.xp ?? 0,
          level: stats?.level ?? 1,
          levelRole: stats?.levelRole ?? "Newcomer",
          levelRoleColor: stats?.levelRoleColor ?? "#94a3b8",
        };
      })
      .filter((e) => e.xp > 0)
      .sort((a, b) => b.xp - a.xp || b.level - a.level)
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));

    return Response.json({
      count: ranked.length,
      entries: ranked,
    });
  } catch (err) {
    console.error("Bot leaderboard error:", err);
    return Response.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
