/** Ko-fi profile for AniKitty donations. */
export const KOFI_URL = "https://ko-fi.com/fampep";
export const KOFI_HANDLE = "fampep";

/** Current monthly infrastructure cost (EUR). */
export const MONTHLY_GOAL_EUR = 96;

/** Optional manual override for progress bar (set in env, e.g. after checking Ko-fi). */
export function getDonationProgress(): {
  goalEur: number;
  raisedEur: number;
  percent: number;
} {
  const goalEur = MONTHLY_GOAL_EUR;
  const raw = process.env.NEXT_PUBLIC_DONATION_RAISED_EUR;
  const raisedEur = raw ? Math.max(0, parseFloat(raw)) || 0 : 0;
  const percent = goalEur > 0 ? Math.min(100, Math.round((raisedEur / goalEur) * 100)) : 0;
  return { goalEur, raisedEur, percent };
}

export function kofiTipUrl(amountEur: number): string {
  return `${KOFI_URL}?amount=${amountEur}`;
}
