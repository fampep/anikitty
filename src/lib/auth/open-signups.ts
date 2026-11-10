/**
 * Open signups kill-switch.
 *
 * Set `OPEN_SIGNUPS=true` (or `1` / `yes` / `on`) in Coolify runtime env to allow
 * new account creation. Any other value (or unset) keeps signups closed.
 *
 * Login for existing accounts is unaffected.
 */
export function isOpenSignupsEnabled(): boolean {
  const raw = process.env.OPEN_SIGNUPS?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export const SIGNUPS_CLOSED_MESSAGE =
  "New signups are closed right now. Join Telegram for updates, or sign in if you already have an account.";
