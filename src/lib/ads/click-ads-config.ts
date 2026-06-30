/** Push-sdk / Monetizer click-ad zone (see dashboard). */
export const CLICK_AD_ZONE_ID = 2910352;
export const CLICK_AD_SW_DOMAIN = "push-sdk.com";
export const CLICK_AD_SW_PATH = `/${CLICK_AD_ZONE_ID}.sw.js`;

/** Onclick smart-tag script host path used by push-sdk zones. */
export const CLICK_AD_SCRIPT_SRC = `https://${CLICK_AD_SW_DOMAIN}/400/${CLICK_AD_ZONE_ID}`;

export function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export function isWatchPath(pathname: string): boolean {
  return pathname === "/anime/watch" || pathname.startsWith("/anime/watch/");
}

/** Player chrome should not trigger click ads; episode list/comments on watch page still can. */
export function isPlayerSurfaceTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest("[data-ad-free-player]");
}
