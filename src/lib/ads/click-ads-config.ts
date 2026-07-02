/** EffectiveCPM on-click popunder — one tag per page, place before </head>. */
export const CLICK_AD_SCRIPT_SRC =
  "https://pl30172658.effectivecpmnetwork.com/a2/1e/38/a21e38fcd3c151b55ac215d3281f5ddb.js";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Watch/player page — click ads are never loaded here. */
export function isWatchPath(pathname: string): boolean {
  return pathname === "/anime/watch" || pathname.startsWith("/anime/watch/");
}
