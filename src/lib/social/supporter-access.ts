import type { getDb } from "@/db";
import { kofiWebhookEvents, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  calculateSupporterDays,
  DONATOR_ROLE,
  SITE_OWNER_USERNAME,
  STAFF_ROLES,
} from "@/lib/social/donation-config";
import {
  isBuiltinRole,
} from "@/lib/security/permissions";
import {
  fetchKofiFeedPayments,
  findUnclaimedPaymentForEmail,
  findUnclaimedPaymentForUsername,
  kofiPageIdConfigured,
  kofiWebhookPayloadToPayment,
  type KofiFeedPayment,
  type KofiWebhookPayload,
} from "@/lib/social/kofi-feed";
import { grantKittycoins } from "@/lib/shop/kittycoins";
import { KITTYCOIN_REWARDS } from "@/lib/shop/catalog";

export const AD_FREE_PERMISSION = "ads.ad_free" as const;

type Db = ReturnType<typeof getDb>;

type SupporterUser = {
  id: string;
  username: string;
  role: string;
  supporterUntil: Date | null;
};

export type SupporterClaimResult =
  | { ok: true; granted: true; paymentId: string; daysAdded: number; supporterUntil: string }
  | { ok: true; granted: false; reason: SupporterClaimReason }
  | { ok: false; error: string };

export type SupporterClaimReason =
  | "feed_not_configured"
  | "payment_not_found"
  | "already_claimed"
  | "amount_too_small";

export type KofiWebhookResult =
  | { granted: true; userId: string; daysAdded: number; supporterUntil: string }
  | { granted: false; reason: string };

function parseSupporterUntil(
  value?: Date | string | null,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hasActiveDonatorStatus(
  role?: string | null,
  supporterUntil?: Date | string | null,
): boolean {
  if (role !== DONATOR_ROLE) return false;
  const until = parseSupporterUntil(supporterUntil);
  if (!until) return true;
  return until.getTime() > Date.now();
}

/**
 * Donators (and staff with an active tip window) can turn site ads off.
 * Admins always can. Everyone else keeps ads on.
 */
export function hasAdFreeAccess(
  role?: string | null,
  supporterUntil?: Date | string | null,
): boolean {
  if (role === "admin") return true;
  if (hasActiveDonatorStatus(role, supporterUntil)) return true;
  if (role && STAFF_ROLES.has(role)) {
    const until = parseSupporterUntil(supporterUntil);
    return !!until && until.getTime() > Date.now();
  }
  return false;
}

export function extendSupporterUntilByDays(
  current: Date | null | undefined,
  days: number,
): Date {
  if (days <= 0) {
    return current && current.getTime() > Date.now() ? current : new Date();
  }
  const base =
    current && current.getTime() > Date.now() ? current : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

/** True when a DM to @fampep is a self-claim request (@yourusername). */
export function messageClaimsSupporter(body: string, senderUsername: string): boolean {
  const u = senderUsername.trim().toLowerCase();
  if (!u || !body.trim()) return false;

  const mentions = [...body.matchAll(/@([a-zA-Z0-9_]{3,25})/g)].map((m) =>
    m[1].toLowerCase(),
  );
  return mentions.includes(u);
}

/** Demote expired donators; returns updated role if changed. */
export async function expireSupporterIfNeeded(
  db: Db,
  user: { id: string; role: string; supporterUntil: Date | null },
): Promise<string> {
  if (user.role !== DONATOR_ROLE) return user.role;
  if (!user.supporterUntil || user.supporterUntil.getTime() > Date.now()) {
    return user.role;
  }

  await db
    .update(users)
    .set({ role: "user", supporterUntil: null })
    .where(eq(users.id, user.id));

  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("supporter_expired");

  return "user";
}

async function loadClaimedPaymentIds(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ messageId: kofiWebhookEvents.messageId })
    .from(kofiWebhookEvents);
  return new Set(rows.map((r) => r.messageId));
}

async function isPaymentClaimed(db: Db, paymentId: string): Promise<boolean> {
  const [row] = await db
    .select({ messageId: kofiWebhookEvents.messageId })
    .from(kofiWebhookEvents)
    .where(eq(kofiWebhookEvents.messageId, paymentId))
    .limit(1);
  return !!row;
}

async function recordClaimedPayment(
  db: Db,
  payment: KofiFeedPayment,
  username: string,
  daysAdded: number,
  source: "kofi_feed" | "kofi_webhook",
): Promise<boolean> {
  const inserted = await db
    .insert(kofiWebhookEvents)
    .values({
      messageId: payment.id,
      kofiTransactionId: payment.kofiTransactionId,
      email: payment.email,
      type: payment.type,
      amount: String(payment.amount),
      currency: payment.currency,
      raw: {
        username,
        message: payment.message,
        source,
        daysAdded,
        amountEur: payment.amountEur,
      },
    })
    .onConflictDoNothing()
    .returning({ messageId: kofiWebhookEvents.messageId });

  return inserted.length > 0;
}

async function grantSupporterAccess(
  db: Db,
  user: SupporterUser,
  days: number,
): Promise<Date> {
  const nextUntil = extendSupporterUntilByDays(user.supporterUntil, days);

  if (
    STAFF_ROLES.has(user.role) ||
    (isBuiltinRole(user.role) && user.role !== "user")
  ) {
    await db
      .update(users)
      .set({ supporterUntil: nextUntil })
      .where(eq(users.id, user.id));
    return nextUntil;
  }

  await db
    .update(users)
    .set({ role: DONATOR_ROLE, supporterUntil: nextUntil })
    .where(eq(users.id, user.id));

  return nextUntil;
}

async function grantKofiPaymentToUser(
  db: Db,
  user: SupporterUser,
  payment: KofiFeedPayment,
  username: string,
  source: "kofi_feed" | "kofi_webhook",
): Promise<
  | { granted: true; daysAdded: number; supporterUntil: string }
  | { granted: false; reason: SupporterClaimReason }
> {
  if (await isPaymentClaimed(db, payment.id)) {
    return { granted: false, reason: "already_claimed" };
  }

  const daysAdded = calculateSupporterDays(payment.amountEur);
  if (daysAdded <= 0) {
    return { granted: false, reason: "amount_too_small" };
  }

  const recorded = await recordClaimedPayment(
    db,
    payment,
    username,
    daysAdded,
    source,
  );
  if (!recorded) {
    return { granted: false, reason: "already_claimed" };
  }

  const supporterUntil = await grantSupporterAccess(db, user, daysAdded);
  await grantKittycoins(
    db,
    user.id,
    KITTYCOIN_REWARDS.kofiBonus,
    "kofi",
    payment.id,
  );
  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("supporter_granted");
  return {
    granted: true,
    daysAdded,
    supporterUntil: supporterUntil.toISOString(),
  };
}

async function findUserByUsername(db: Db, username: string): Promise<SupporterUser | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(sql`lower(${users.username}) = ${normalized}`)
    .limit(1);

  return user ?? null;
}

async function findUserByEmail(db: Db, email: string): Promise<SupporterUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  return user ?? null;
}

/** Resolve an AniKitty account from Ko-fi message @mentions or payer email. */
export async function findUserForKofiPayment(
  db: Db,
  message: string,
  email?: string | null,
): Promise<{ user: SupporterUser; matchedBy: "username" | "email" } | null> {
  const mentions = [...message.matchAll(/@([a-zA-Z0-9_]{3,25})/g)].map((m) => m[1]);
  for (const mention of mentions) {
    const user = await findUserByUsername(db, mention);
    if (user) return { user, matchedBy: "username" };
  }

  if (email) {
    const user = await findUserByEmail(db, email);
    if (user) return { user, matchedBy: "email" };
  }

  return null;
}

/** Ko-fi webhook — auto-grant donator when we can match the payer to an account. */
export async function handleKofiWebhookPayment(
  db: Db,
  payload: KofiWebhookPayload,
): Promise<KofiWebhookResult> {
  const payment = kofiWebhookPayloadToPayment(payload);
  if (!payment) {
    return { granted: false, reason: "ignored_type" };
  }

  const match = await findUserForKofiPayment(db, payment.message, payment.email);
  if (!match) {
    return { granted: false, reason: "user_not_found" };
  }

  const result = await grantKofiPaymentToUser(
    db,
    match.user,
    payment,
    match.user.username,
    "kofi_webhook",
  );

  if (!result.granted) {
    return { granted: false, reason: result.reason };
  }

  console.info(
    "[kofi webhook] granted donator",
    match.user.id,
    `+${result.daysAdded}d`,
    `until ${result.supporterUntil}`,
  );

  return {
    granted: true,
    userId: match.user.id,
    daysAdded: result.daysAdded,
    supporterUntil: result.supporterUntil,
  };
}

/** Match Ko-fi feed and grant donator access for the donation amount. */
export async function claimSupporterFromKofi(
  db: Db,
  userId: string,
  username: string,
  email?: string | null,
): Promise<SupporterClaimResult> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    return { ok: false, error: "Invalid username" };
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { ok: false, error: "User not found" };

  if (!kofiPageIdConfigured()) {
    return { ok: true, granted: false, reason: "feed_not_configured" };
  }

  const [payments, claimedIds] = await Promise.all([
    fetchKofiFeedPayments(true),
    loadClaimedPaymentIds(db),
  ]);

  const payment =
    findUnclaimedPaymentForUsername(payments, normalizedUsername, claimedIds) ??
    (email
      ? findUnclaimedPaymentForEmail(payments, email, claimedIds)
      : null);

  if (!payment) {
    return { ok: true, granted: false, reason: "payment_not_found" };
  }

  const result = await grantKofiPaymentToUser(
    db,
    user,
    payment,
    normalizedUsername,
    "kofi_feed",
  );

  if (!result.granted) {
    return { ok: true, granted: false, reason: result.reason };
  }

  return {
    ok: true,
    granted: true,
    paymentId: payment.id,
    daysAdded: result.daysAdded,
    supporterUntil: result.supporterUntil,
  };
}

export async function tryAutoClaimFromDm(
  db: Db,
  opts: {
    senderId: string;
    senderUsername: string;
    recipientUsername: string;
    body: string;
  },
): Promise<SupporterClaimResult | null> {
  if (opts.recipientUsername.toLowerCase() !== SITE_OWNER_USERNAME.toLowerCase()) {
    return null;
  }
  if (!messageClaimsSupporter(opts.body, opts.senderUsername)) {
    return null;
  }

  try {
    return await claimSupporterFromKofi(db, opts.senderId, opts.senderUsername);
  } catch (err) {
    console.error("[supporter] DM auto-claim failed:", err);
    return null;
  }
}

/** Admin panel: extend or grant supporter / donator access. */
export async function adminGrantSupporterDays(
  db: Db,
  userId: string,
  days: number,
): Promise<{ supporterUntil: string; daysAdded: number }> {
  if (!Number.isFinite(days) || days <= 0 || days > 3650) {
    throw new Error("Days must be between 1 and 3650");
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  const until = await grantSupporterAccess(db, user, Math.floor(days));
  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("admin_supporter_grant");
  return { supporterUntil: until.toISOString(), daysAdded: Math.floor(days) };
}

/**
 * Admin fallback when Ko-fi auto-claim fails: set an absolute ad-free end date
 * (does not stack — replaces the current window).
 */
export async function adminSetSupporterUntil(
  db: Db,
  userId: string,
  untilInput: Date | string,
): Promise<{ supporterUntil: string }> {
  const until = parseSupporterUntil(untilInput);
  if (!until || until.getTime() <= Date.now()) {
    throw new Error("End date must be a future date/time");
  }
  // Cap ~10 years out
  if (until.getTime() > Date.now() + 3650 * 24 * 60 * 60 * 1000) {
    throw new Error("End date too far in the future (max ~10 years)");
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      supporterUntil: users.supporterUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  if (STAFF_ROLES.has(user.role)) {
    await db.update(users).set({ supporterUntil: until }).where(eq(users.id, user.id));
  } else {
    await db
      .update(users)
      .set({ role: DONATOR_ROLE, supporterUntil: until })
      .where(eq(users.id, user.id));
  }

  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("admin_supporter_set");
  return { supporterUntil: until.toISOString() };
}

/** Admin panel: remove supporter perks immediately. */
export async function adminRevokeSupporter(db: Db, userId: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot revoke admin supporter perks");

  await db
    .update(users)
    .set({
      supporterUntil: null,
      ...(user.role === DONATOR_ROLE ? { role: "user" } : {}),
    })
    .where(eq(users.id, userId));

  const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
  notifyDiscordRoleSync("admin_supporter_revoke");
}
