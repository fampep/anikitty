/** Ko-fi profile for AniKitty donations. */
export const KOFI_URL = "https://ko-fi.com/fampep";
export const KOFI_HANDLE = "fampep";

/** Monthly Ko-fi membership price (EUR) for ad-free viewing. */
export const KOFI_MEMBERSHIP_EUR = 3;

/** Ko-fi membership / tier page — override with NEXT_PUBLIC_KOFI_MEMBERSHIP_URL if needed. */
export const KOFI_MEMBERSHIP_URL =
  process.env.NEXT_PUBLIC_KOFI_MEMBERSHIP_URL ?? `${KOFI_URL}/membership`;

export const DONATOR_ROLE = "donator";

/** Site owner — grants donator role manually after Ko-fi payment. */
export const SITE_OWNER_USERNAME = KOFI_HANDLE;

export function siteOwnerDmHref(): string {
  return `/messages?user=${SITE_OWNER_USERNAME}`;
}

/** Staff roles that should never be overwritten by Ko-fi auto-claim. */
export const STAFF_ROLES = new Set(["admin", "moderator"]);

export function kofiMembershipUrl(): string {
  return KOFI_MEMBERSHIP_URL;
}

/** Ko-fi checkout link — user should put @username in the Ko-fi message field. */
export function kofiMembershipUrlForUsername(username: string): string {
  const base = kofiMembershipUrl();
  const handle = username.trim().replace(/^@/, "");
  if (!handle) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}message=${encodeURIComponent(`@${handle}`)}`;
}

export function kofiTipUrl(amountEur: number): string {
  return `${KOFI_URL}?amount=${amountEur}`;
}
