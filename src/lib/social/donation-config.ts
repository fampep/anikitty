/** Ko-fi profile for AniKitty donations. */
export const KOFI_URL = "https://ko-fi.com/fampep";
export const KOFI_HANDLE = "fampep";

/** Reference donation: this many EUR buys one unit of donator time. */
export const KOFI_DONATION_UNIT_EUR = 4;

/** Days of donator rank per reference unit (€4 → 30 days). */
export const KOFI_DONATION_UNIT_DAYS = 30;

/** Smallest Ko-fi tip we accept for auto-claim. */
export const MIN_DONATION_EUR = 0.01;

/** Monthly server-cost goal shown on the home page (EUR). */
export const MONTHLY_DONATION_GOAL_EUR = Number(
  process.env.MONTHLY_DONATION_GOAL_EUR ?? "100",
) || 100;

export const DONATOR_ROLE = "donator";

/** Site owner — manual fallback for donation issues. */
export const SITE_OWNER_USERNAME = KOFI_HANDLE;

export function siteOwnerDmHref(): string {
  return `/messages?user=${SITE_OWNER_USERNAME}`;
}

/** Staff roles that should never be overwritten by Ko-fi auto-claim. */
export const STAFF_ROLES = new Set(["admin", "moderator"]);

/**
 * Days of donator rank for a Ko-fi donation (EUR).
 * Uses rounding so odd tips map cleanly — e.g. €2→15, €4→30, €8→60.
 */
export function calculateSupporterDays(amountEur: number): number {
  if (!Number.isFinite(amountEur) || amountEur < MIN_DONATION_EUR) return 0;
  const cents = Math.round(amountEur * 100);
  const scaled =
    (cents / 100 / KOFI_DONATION_UNIT_EUR) * KOFI_DONATION_UNIT_DAYS;
  return Math.max(1, Math.round(scaled));
}

/** Rough EUR equivalent for Ko-fi amounts in other currencies. */
export function amountToEur(amount: number, currency: string): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const code = currency.trim().toUpperCase();
  if (code === "EUR") return amount;
  if (code === "USD" || code === "GBP" || code === "CAD" || code === "AUD") {
    return amount * 0.92;
  }
  return amount;
}

export function kofiDonationUrl(): string {
  return KOFI_URL;
}

/** Ko-fi tip link — user should put @username in the Ko-fi message field. */
export function kofiDonationUrlForUsername(username: string): string {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) return KOFI_URL;
  const sep = KOFI_URL.includes("?") ? "&" : "?";
  return `${KOFI_URL}${sep}message=${encodeURIComponent(`@${handle}`)}`;
}

export function kofiTipUrl(amountEur: number): string {
  return `${KOFI_URL}?amount=${amountEur}`;
}
