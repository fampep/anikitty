import type { getDb } from "@/db";
import { users, userPasskeys } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type AccountBadges = {
  anilist: boolean;
  anilistUsername: string | null;
  discord: boolean;
  discordUsername: string | null;
  twoFactor: boolean;
  passkeys: boolean;
};

export async function getAccountBadgesForUser(
  db: Db,
  userId: string,
): Promise<AccountBadges> {
  const [[user], [passkeyCount]] = await Promise.all([
    db
      .select({
        anilistAccessToken: users.anilistAccessToken,
        anilistUsername: users.anilistUsername,
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        totpEnabled: users.totpEnabled,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userPasskeys)
      .where(eq(userPasskeys.userId, userId)),
  ]);

  return {
    anilist: !!user?.anilistAccessToken,
    anilistUsername: user?.anilistUsername ?? null,
    discord: !!user?.discordId,
    discordUsername: user?.discordUsername ?? null,
    twoFactor: user?.totpEnabled ?? false,
    passkeys: (passkeyCount?.count ?? 0) > 0,
  };
}
