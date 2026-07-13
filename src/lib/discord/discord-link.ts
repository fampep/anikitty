import { randomBytes } from "crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { getDb } from "@/db";
import { discordLinkCodes, users } from "@/db/schema";
import { discordDisplayName, type DiscordUser } from "@/lib/oauth/discord-oauth";

type Db = ReturnType<typeof getDb>;

const CODE_TTL_MS = 10 * 60 * 1000;

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function randomLinkCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function createDiscordLinkCode(db: Db, userId: string): Promise<string> {
  const now = new Date();
  await db
    .delete(discordLinkCodes)
    .where(and(eq(discordLinkCodes.userId, userId), lt(discordLinkCodes.expiresAt, now)));

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomLinkCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    try {
      await db.insert(discordLinkCodes).values({ userId, code, expiresAt });
      return code;
    } catch {
      // collision — retry
    }
  }

  throw new Error("Could not generate link code");
}

export type DiscordLinkResult =
  | { ok: true; username: string }
  | { ok: false; reason: "invalid_code" | "expired" | "taken" | "already_linked" | "user_missing" };

export async function linkDiscordAccountByCode(
  db: Db,
  codeInput: string,
  discordUser: Pick<DiscordUser, "id" | "username" | "global_name">,
): Promise<DiscordLinkResult> {
  const code = normalizeCode(codeInput);
  if (code.length < 6) return { ok: false, reason: "invalid_code" };

  const now = new Date();
  const [row] = await db
    .select({
      userId: discordLinkCodes.userId,
      expiresAt: discordLinkCodes.expiresAt,
    })
    .from(discordLinkCodes)
    .where(and(eq(discordLinkCodes.code, code), gt(discordLinkCodes.expiresAt, now)))
    .limit(1);

  if (!row) return { ok: false, reason: "expired" };

  const result = await linkDiscordToUser(db, row.userId, {
    id: discordUser.id,
    username: discordUser.username,
    global_name: discordUser.global_name,
  });

  if (result.ok) {
    await db.delete(discordLinkCodes).where(eq(discordLinkCodes.code, code));
  }

  return result;
}

export async function linkDiscordToUser(
  db: Db,
  userId: string,
  discordUser: Pick<DiscordUser, "id" | "username" | "global_name">,
): Promise<DiscordLinkResult> {
  const discordId = discordUser.id;
  const discordUsername = discordDisplayName(discordUser as DiscordUser);

  const [current] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!current) return { ok: false, reason: "user_missing" };
  if (current.discordId === discordId) return { ok: true, username: current.username };
  if (current.discordId) return { ok: false, reason: "already_linked" };

  const [other] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  if (other && other.id !== current.id) return { ok: false, reason: "taken" };

  await db
    .update(users)
    .set({ discordId, discordUsername })
    .where(eq(users.id, current.id));

  return { ok: true, username: current.username };
}

export async function findUserByDiscordId(
  db: Db,
  discordId: string,
): Promise<{ id: string; username: string; role: string; discordBoostSince: Date | null } | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      discordBoostSince: users.discordBoostSince,
    })
    .from(users)
    .where(eq(users.discordId, discordId))
    .limit(1);
  return user ?? null;
}
