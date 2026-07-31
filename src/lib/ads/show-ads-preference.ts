import {
  CLICK_AD_DOMAIN,
  getClickAdScriptSrc,
} from "@/lib/ads/click-ads-config";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

/** Remove popunder click-ad scripts injected by the loader. */
export function unloadClickAds(): void {
  if (typeof document === "undefined") return;

  document.getElementById(CLICK_AD_SCRIPT_ID)?.remove();
  document
    .querySelectorAll(`script[src*="${CLICK_AD_DOMAIN}"]`)
    .forEach((node) => node.remove());
}

/**
 * Inject the popunder zone script once when ads should run.
 * Matches dashboard snippet: async script from unfolded-uncle.com (zone 7275065).
 */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const parent = [document.documentElement, document.body].filter(Boolean).pop();
  if (!parent) return;

  const script = document.createElement("script");
  script.id = CLICK_AD_SCRIPT_ID;
  script.src = getClickAdScriptSrc();
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";
  parent.appendChild(script);
}
