import {
  getClickAdScriptSrc,
  getMonetagZoneId,
  MONETAG_DOMAIN,
} from "@/lib/ads/click-ads-config";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

/** Remove Monetag click-ad scripts injected by the loader. */
export function unloadClickAds(): void {
  if (typeof document === "undefined") return;

  document.getElementById(CLICK_AD_SCRIPT_ID)?.remove();
  document
    .querySelectorAll(
      `script[src*="${MONETAG_DOMAIN}"], script[src*="3nbf4.com"]`,
    )
    .forEach((node) => node.remove());
}

/**
 * Inject the Monetag tag script once when ads should run.
 * Matches dashboard snippet: dataset.zone + https://al5sm.com/tag.min.js
 */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const parent = [document.documentElement, document.body].filter(Boolean).pop();
  if (!parent) return;

  const script = document.createElement("script");
  script.id = CLICK_AD_SCRIPT_ID;
  script.dataset.zone = String(getMonetagZoneId());
  script.src = getClickAdScriptSrc();
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";
  parent.appendChild(script);
}
