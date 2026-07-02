/** Monetag publisher zone (see dashboard → Sites → zone ID). */
export const MONETAG_DOMAIN = "3nbf4.com";

export const CLICK_AD_ZONE_ID = 11229456;

/** OnClick / popunder tag — paste below <head> in Monetag dashboard. */
export const CLICK_AD_SCRIPT_SRC = `https://${MONETAG_DOMAIN}/${CLICK_AD_ZONE_ID}/invoke.js`;

/** Push notification service worker loader (paired with worker/index.js). */
export const MONETAG_SW_SCRIPT_SRC = `https://${MONETAG_DOMAIN}/act/files/service-worker.min.js?r=sw`;

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Watch/player page — click ads are never loaded here. */
export function isWatchPath(pathname: string): boolean {
  return pathname === "/anime/watch" || pathname.startsWith("/anime/watch/");
}
