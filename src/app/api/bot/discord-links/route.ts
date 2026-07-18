import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-access";

/**
 * Linked Discord accounts + effective site roles for Discord role sync.
 * Only returns discordId / site role flags — no emails or secrets.
 */
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
        const roles = new Set<string>();
        if (r.role) roles.add(r.role);
        if (hasActiveDonatorStatus(r.role, r.supporterUntil)) {
          roles.add("donator");
        }
        return {
          discordId: r.discordId as string,
          discordUsername: r.discordUsername ?? null,
          siteUsername: r.siteUsername,
          role: r.role,
          roles: [...roles],
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
