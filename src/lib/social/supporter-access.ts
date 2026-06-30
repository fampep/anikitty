import type { getDb } from "@/db";
import { kofiWebhookEvents, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateSupporterDays,
  DONATOR_ROLE,
  SITE_OWNER_USERNAME,
  STAFF_ROLES,
} from "@/lib/social/donation-config";
import {
  hasPermission,
  isBuiltinRole,
} from "@/lib/security/permissions";
import {
  fetchKofiFeedPayments,
  findUnclaimedPaymentForUsername,
  kofiPageIdConfigured,
  type KofiFeedPayment,
} from "@/lib/social/kofi-feed";

export const AD_FREE_PERMISSION = "ads.ad_free" as const;

type Db = ReturnType<typeof getDb>;

export type SupporterClaimResult =
  | { ok: true; granted: true; paymentId: string; daysAdded: number; supporterUntil: string }
  | { ok: true; granted: false; reason: SupporterClaimReason }
  | { ok: false; error: string };

export type SupporterClaimReason =
  | "feed_not_configured"
  | "payment_not_found"
  | "already_claimed"
  | "amount_too_small";

export function hasAdFreePerk(
  role?: string | null,
  permissions?: string[] | null,
  supporterUntil?: Date | null,
): boolean {
  if (role === "admin") return true;

  const untilActive =
    supporterUntil != null && supporterUntil.getTime() > Date.now();

  if (untilActive) return true;

  if (role === DONATOR_ROLE && !supporterUntil) return true;

  if (
    permissions &&
    hasPermission(permissions, AD_FREE_PERMISSION) &&
    role === DONATOR_ROLE &&
    !supporterUntil
  ) {
    return true;
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

  return "user";
}

async function loadClaimedPaymentIds(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({ messageId: kofiWebhookEvents.messageId })
    .from(kofiWebhookEvents);
  return new Set(rows.map((r) => r.messageId));
}

async function recordClaimedPayment(
  db: Db,
  payment: KofiFeedPayment,
  username: string,
  daysAdded: number,
): Promise<boolean> {
  const inserted = await db
    .insert(kofiWebhookEvents)
    .values({
      messageId: payment.id,
      kofiTransactionId: null,
      email: null,
      type: payment.type,
      amount: String(payment.amount),
      currency: payment.currency,
      raw: {
        username,
        message: payment.message,
        source: "kofi_feed",
        daysAdded,
      },
    })
    .onConflictDoNothing()
    .returning({ messageId: kofiWebhookEvents.messageId });

  return inserted.length > 0;
}

async function grantSupporterAccess(
  db: Db,
  user: { id: string; role: string; supporterUntil: Date | null },
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

/** Match Ko-fi feed and grant donator access for the donation amount. */
export async function claimSupporterFromKofi(
  db: Db,
  userId: string,
  username: string,
): Promise<SupporterClaimResult> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    return { ok: false, error: "Invalid username" };
  }

  const [user] = await db
    .select({
      id: users.id,
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
    fetchKofiFeedPayments(),
    loadClaimedPaymentIds(db),
  ]);

  const payment = findUnclaimedPaymentForUsername(
    payments,
    normalizedUsername,
    claimedIds,
  );

  if (!payment) {
    return { ok: true, granted: false, reason: "payment_not_found" };
  }

  const daysAdded = calculateSupporterDays(payment.amount);
  if (daysAdded <= 0) {
    return { ok: true, granted: false, reason: "amount_too_small" };
  }

  const recorded = await recordClaimedPayment(
    db,
    payment,
    normalizedUsername,
    daysAdded,
  );
  if (!recorded) {
    return { ok: true, granted: false, reason: "already_claimed" };
  }

  const supporterUntil = await grantSupporterAccess(db, user, daysAdded);
  return {
    ok: true,
    granted: true,
    paymentId: payment.id,
    daysAdded,
    supporterUntil: supporterUntil.toISOString(),
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
): Promise<void> {
  if (opts.recipientUsername.toLowerCase() !== SITE_OWNER_USERNAME.toLowerCase()) {
    return;
  }
  if (!messageClaimsSupporter(opts.body, opts.senderUsername)) {
    return;
  }

  try {
    await claimSupporterFromKofi(db, opts.senderId, opts.senderUsername);
  } catch (err) {
    console.error("[supporter] DM auto-claim failed:", err);
  }
}
