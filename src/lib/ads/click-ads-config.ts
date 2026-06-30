/** Monetizer / greate.net click-ad zone (see dashboard). */
export const CLICK_AD_ZONE_ID = 2910356;

/** Panel snippet: <script async type="text/javascript" src="https://s0-greate.net/p/2910356"></script> */
export const CLICK_AD_SCRIPT_SRC = `https://s0-greate.net/p/${CLICK_AD_ZONE_ID}`;

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Watch/player page — click ads are never loaded here. */
export function isWatchPath(pathname: string): boolean {
  return pathname === "/anime/watch" || pathname.startsWith("/anime/watch/");
}
