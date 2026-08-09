import type { getDb } from "@/db";
import { kittycoinLedger, userShopItems, users } from "@/db/schema";
import {
  FREE_FRAME_SLUG,
  getShopItem,
  SHOP_CATALOG,
  type ShopItemType,
} from "@/lib/shop/catalog";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-access";
import { and, eq, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export type UserCosmetics = {
  balance: number;
  owned: string[];
  equipped: {
    frame: string | null;
    sticker: string | null;
    icon: string | null;
  };
};

export async function getUserCosmetics(db: Db, userId: string): Promise<UserCosmetics> {
  const [user] = await db
    .select({
      balance: users.kittycoinBalance,
      frame: users.equippedFrame,
      sticker: users.equippedSticker,
      icon: users.equippedIcon,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const ownedRows = await db
    .select({ slug: userShopItems.itemSlug })
    .from(userShopItems)
    .where(eq(userShopItems.userId, userId));

  return {
    balance: user?.balance ?? 0,
    owned: ownedRows.map((r) => r.slug),
    equipped: {
      frame: user?.frame ?? null,
      sticker: user?.sticker ?? null,
      icon: user?.icon ?? null,
    },
  };
}

export async function ensureStarterItems(db: Db, userId: string) {
  await db
    .insert(userShopItems)
    .values({ userId, itemSlug: FREE_FRAME_SLUG })
    .onConflictDoNothing();
}

export async function grantKittycoins(
  db: Db,
  userId: string,
  delta: number,
  reason: string,
  referenceId?: string | null,
): Promise<{ granted: boolean; balance: number }> {
  if (delta === 0) {
    const cosmetics = await getUserCosmetics(db, userId);
    return { granted: false, balance: cosmetics.balance };
  }

  try {
    await db.insert(kittycoinLedger).values({
      userId,
      delta,
      reason,
      referenceId: referenceId ?? null,
    });
  } catch {
    const cosmetics = await getUserCosmetics(db, userId);
    return { granted: false, balance: cosmetics.balance };
  }

  const [row] = await db
    .update(users)
    .set({ kittycoinBalance: sql`${users.kittycoinBalance} + ${delta}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.kittycoinBalance });

  return { granted: true, balance: row?.balance ?? 0 };
}

export async function purchaseShopItem(
  db: Db,
  userId: string,
  slug: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const item = getShopItem(slug);
  if (!item) return { ok: false, error: "Item not found" };

  const [user] = await db
    .select({
      balance: users.kittycoinBalance,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { ok: false, error: "User not found" };

  const [owned] = await db
    .select({ id: userShopItems.id })
    .from(userShopItems)
    .where(and(eq(userShopItems.userId, userId), eq(userShopItems.itemSlug, slug)))
    .limit(1);

  if (owned) return { ok: false, error: "Already owned" };

  if (item.donatorOnly && !hasActiveDonatorStatus(user.role, user.supporterUntil)) {
    return { ok: false, error: "Ko-fi supporter perk required" };
  }

  if (item.price > 0 && user.balance < item.price) {
    return { ok: false, error: "Not enough Kittycoins" };
  }

  if (item.price > 0) {
    const debit = await grantKittycoins(db, userId, -item.price, "purchase", slug);
    if (!debit.granted) return { ok: false, error: "Purchase failed" };
  }

  await db.insert(userShopItems).values({ userId, itemSlug: slug });

  const cosmetics = await getUserCosmetics(db, userId);
  return { ok: true, balance: cosmetics.balance };
}

export async function equipShopItem(
  db: Db,
  userId: string,
  slug: string | null,
  slot: ShopItemType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!slug) {
    if (slot === "frame") {
      await db.update(users).set({ equippedFrame: null }).where(eq(users.id, userId));
    } else if (slot === "sticker") {
      await db.update(users).set({ equippedSticker: null }).where(eq(users.id, userId));
    } else {
      await db.update(users).set({ equippedIcon: null }).where(eq(users.id, userId));
    }
    return { ok: true };
  }

  const item = getShopItem(slug);
  if (!item || item.type !== slot) return { ok: false, error: "Invalid item for slot" };

  const [owned] = await db
    .select({ id: userShopItems.id })
    .from(userShopItems)
    .where(and(eq(userShopItems.userId, userId), eq(userShopItems.itemSlug, slug)))
    .limit(1);

  if (!owned) return { ok: false, error: "Item not owned" };

  if (slot === "frame") {
    await db.update(users).set({ equippedFrame: slug }).where(eq(users.id, userId));
  } else if (slot === "sticker") {
    await db.update(users).set({ equippedSticker: slug }).where(eq(users.id, userId));
  } else {
    await db.update(users).set({ equippedIcon: slug }).where(eq(users.id, userId));
  }

  return { ok: true };
}

export function catalogForClient(owned: string[]) {
  return SHOP_CATALOG.map((item) => ({
    ...item,
    owned: owned.includes(item.slug) || item.slug === FREE_FRAME_SLUG,
  }));
}

export async function grantWelcomeKittycoins(db: Db, userId: string) {
  await ensureStarterItems(db, userId);
  await grantKittycoins(db, userId, 100, "welcome", userId);
}

export type DailyLoginResult = {
  granted: boolean;
  balance: number;
  streak: number;
  longestStreak: number;
  isNewDay: boolean;
  streakBonus: number;
};

/**
 * Grants the daily-login reward and advances the login streak. The 15-coin
 * base reward is idempotent per day (ledger reason "daily"). Consecutive days
 * grow the streak; every 7th day pays a 50-coin bonus.
 */
export async function grantDailyLoginKittycoins(
  db: Db,
  userId: string,
): Promise<DailyLoginResult> {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const [u] = await db
    .select({
      last: users.lastLoginDate,
      streak: users.loginStreak,
      longest: users.longestStreak,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let streak = u?.streak ?? 0;
  let longestStreak = u?.longest ?? 0;
  let isNewDay = false;

  if (u && u.last !== today) {
    isNewDay = true;
    streak = u.last === yesterday ? (u.streak ?? 0) + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
    await db
      .update(users)
      .set({ loginStreak: streak, longestStreak, lastLoginDate: today })
      .where(eq(users.id, userId));
  }

  const base = await grantKittycoins(db, userId, 15, "daily", today);

  let streakBonus = 0;
  if (isNewDay && streak > 0 && streak % 7 === 0) {
    streakBonus = 50;
    await grantKittycoins(db, userId, streakBonus, "streak", `${today}:${streak}`);
  }

  return {
    granted: base.granted,
    balance: base.balance,
    streak,
    longestStreak,
    isNewDay,
    streakBonus,
  };
}

export async function grantEpisodeKittycoins(
  db: Db,
  userId: string,
  animeId: string,
  episodeId: string,
) {
  return grantKittycoins(db, userId, 8, "episode", `${animeId}:${episodeId}`);
}

export async function grantCommentKittycoins(db: Db, userId: string, commentId: string) {
  return grantKittycoins(db, userId, 5, "comment", commentId);
}
