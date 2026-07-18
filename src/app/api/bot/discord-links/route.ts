import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-access";
import { DONATOR_ROLE, STAFF_ROLES } from "@/lib/social/donation-config";

/**
 * Linked Discord accounts + effective site roles for Discord role sync.
 * Role keys match bot `ROLE_MAP_JSON`: admin, moderator, donator.
 * Only returns discordId / site role flags — no emails or secrets.
 */
function hasActiveSupporterWindow(
  supporterUntil: Date | string | null,
): boolean {
  if (supporterUntil == null) return false;
  const t = new Date(supporterUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

function effectiveDiscordRoles(
  role: string,
  supporterUntil: Date | string | null,
): string[] {
  const roles = new Set<string>();

  if (role === DONATOR_ROLE) {
    if (hasActiveDonatorStatus(role, supporterUntil)) {
      roles.add(DONATOR_ROLE);
    }
    return [...roles];
  }

  if (role && role !== "user") {
    roles.add(role);
  }

  // Staff keep admin/moderator on site but may still have an active supporter window.
  if (STAFF_ROLES.has(role) && hasActiveSupporterWindow(supporterUntil)) {
    roles.add(DONATOR_ROLE);
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
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        siteUsername: users.username,
        role: users.role,
        supporterUntil: users.supporterUntil,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(isNotNull(users.discordId));

    const linked = rows
      .filter((r) => r.discordId && !r.bannedAt)
      .map((r) => {
        const roles = effectiveDiscordRoles(r.role, r.supporterUntil);
        return {
          discordId: r.discordId as string,
          discordUsername: r.discordUsername ?? null,
          siteUsername: r.siteUsername,
          role: r.role,
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
