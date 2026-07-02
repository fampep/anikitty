import { CLICK_AD_SCRIPT_SRC } from "@/lib/ads/click-ads-config";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

/** Remove click-ad scripts injected by the monetizer loader. */
export function unloadClickAds(): void {
  if (typeof document === "undefined") return;

  document.getElementById(CLICK_AD_SCRIPT_ID)?.remove();
  document
    .querySelectorAll('script[src*="3nbf4.com"], script[src*="greate.net"]')
    .forEach((node) => node.remove());
}

/** Inject the click-ad script once when ads should run. */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = CLICK_AD_SCRIPT_ID;
  script.src = CLICK_AD_SCRIPT_SRC;
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";
  document.body.insertBefore(script, document.body.firstChild);
}

export function readShowAdsFromMe(data: Record<string, unknown>): boolean {
  if (typeof data.showAds === "boolean") return data.showAds;
  const user = (data.user ?? {}) as Record<string, unknown>;
  if (typeof user.showAds === "boolean") return user.showAds;
  return true;
}
