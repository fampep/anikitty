/** EffectiveCPM display banner zone. */
export const BANNER_AD_ZONE_ID = "6e33d90b179dbd779f89c200b5bc0eb8";

export const BANNER_AD_SCRIPT_SRC =
  `https://pl30172308.effectivecpmnetwork.com/${BANNER_AD_ZONE_ID}/invoke.js`;

export const BANNER_AD_CONTAINER_ID = `container-${BANNER_AD_ZONE_ID}`;

export const BANNER_AD_SCRIPT_ID = "anikitty-banner-ads";

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Watch/player page — banner ads are never loaded here. */
export function isWatchPath(pathname: string): boolean {
  return pathname === "/anime/watch" || pathname.startsWith("/anime/watch/");
}
