/** Discord Server Boost perk — badge/role only (separate from Ko-fi donator). */
export const BOOSTER_ROLE = "booster" as const;

export const BOOSTER_COLOR = "#ff73fa";
export const BOOSTER_DISPLAY = "Booster";
export const BOOSTER_DESCRIPTION =
  "Boosts the AniKitty Discord server";

/** Roles that must not be overwritten when applying the booster site role. */
export const BOOSTER_PROTECTED_ROLES = new Set([
  "admin",
  "moderator",
  "donator",
  "timestamp_helper",
]);
