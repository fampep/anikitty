import { authorizeBot } from "@/lib/bot/authorize-bot";
import { parseDiscordSnowflake } from "@/lib/bot/discord-sync-roles";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getUserXpStats } from "@/lib/user/user-xp";
import { getLevelProgress } from "@/lib/user/user-level";
import { eq } from "drizzle-orm";
import { siteBase } from "@/lib/bot/bot-anime-payload";
import { ROUTES } from "@/constants/routes";

/**
 * GET /api/bot/profile?discordId=
 * Site level / XP / rank for a Discord-linked AniKitty account.
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const discordId = parseDiscordSnowflake(searchParams.get("discordId"));
  if (!discordId) {
    return Response.json({ error: "discordId required" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ linked: false, discordId }, { status: 404 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        avatarUrl: users.avatarUrl,
        bannedAt: users.bannedAt,
        discordUsername: users.discordUsername,
      })
      .from(users)
      .where(eq(users.discordId, discordId))
      .limit(1);

    if (!row || row.bannedAt) {
      return Response.json(
        { linked: false, discordId },
        { status: 404 },
      );
    }

    const stats = await getUserXpStats(db, row.id);
    const info = getLevelProgress(stats.xp);

    return Response.json({
      linked: true,
      discordId,
      discordUsername: row.discordUsername ?? null,
      siteUsername: row.username,
      role: row.role,
      avatarUrl: row.avatarUrl ?? null,
      profileUrl: `${siteBase()}${ROUTES.profile(row.username)}`,
      xp: stats.xp,
      watchXp: stats.watchXp,
      commentXp: stats.commentXp,
      discordXp: stats.discordXp,
      level: info.level,
      levelRole: stats.levelRole,
      levelRoleColor: stats.levelRoleColor,
      progressPct: Math.round(info.progressPct),
      xpToNext: info.xpToNext,
      xpInLevel: info.xpInLevel,
      xpNeededInLevel: info.xpNeededInLevel,
      nextTier: info.nextTier
        ? { name: info.nextTier.name, minLevel: info.nextTier.minLevel }
        : null,
      startedEpisodes: stats.startedEpisodes,
      completedEpisodes: stats.completedEpisodes,
      commentCount: stats.commentCount,
    });
  } catch (err) {
    console.error("Bot profile error:", err);
    return Response.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
