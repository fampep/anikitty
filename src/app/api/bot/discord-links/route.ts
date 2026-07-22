import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-access";
import { DONATOR_ROLE, STAFF_ROLES } from "@/lib/social/donation-config";
import { BOOSTER_ROLE } from "@/lib/social/booster-config";
import { hasDiscordBoosterStatus } from "@/lib/social/booster-access";
import { getUsersXpStats } from "@/lib/user/user-xp";
import { levelTierDiscordKey } from "@/lib/bot/discord-sync-roles";

/**
 * Linked Discord accounts + effective site roles for Discord role sync.
 * Role keys match `discord_role_map` / bot sync: staff roles + current level tier
 * (e.g. level_newcomer). Only one level key per user.
 */
function hasActiveSupporterWindow(
  supporterUntil: Date | string | null,
): boolean {
  if (supporterUntil == null) return false;
  const t = new Date(supporterUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

function effectiveStaffRoles(
  role: string,
  supporterUntil: Date | string | null,
  discordBoosting: boolean,
): string[] {
  const roles = new Set<string>();

  if (role === DONATOR_ROLE) {
    if (hasActiveDonatorStatus(role, supporterUntil)) {
      roles.add(DONATOR_ROLE);
    }
  } else if (role && role !== "user") {
    roles.add(role);
  }

  if (STAFF_ROLES.has(role) && hasActiveSupporterWindow(supporterUntil)) {
    roles.add(DONATOR_ROLE);
  }

  if (hasDiscordBoosterStatus(discordBoosting, role)) {
    roles.add(BOOSTER_ROLE);
  }

  return [...roles];
}

export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ users: [] });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: users.id,
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        siteUsername: users.username,
        role: users.role,
        supporterUntil: users.supporterUntil,
        discordBoosting: users.discordBoosting,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(isNotNull(users.discordId));

    const active = rows.filter((r) => r.discordId && !r.bannedAt);
    const statsMap = await getUsersXpStats(
      db,
      active.map((r) => r.id),
    );

    const linked = active.map((r) => {
      const roles = effectiveStaffRoles(
        r.role,
        r.supporterUntil,
        !!r.discordBoosting,
      );
      const stats = statsMap.get(r.id);
      const levelKey = levelTierDiscordKey(stats?.levelRole ?? "Newcomer");
      roles.push(levelKey);

      return {
        discordId: r.discordId as string,
        discordUsername: r.discordUsername ?? null,
        siteUsername: r.siteUsername,
        role: r.role,
        discordBoosting: !!r.discordBoosting,
        level: stats?.level ?? 1,
        levelRole: stats?.levelRole ?? "Newcomer",
        roles,
      };
    });

    return Response.json({
      count: linked.length,
      users: linked,
    });
  } catch (err) {
    console.error("Bot discord-links error:", err);
    return Response.json({ error: "Failed to load links" }, { status: 500 });
  }
}
