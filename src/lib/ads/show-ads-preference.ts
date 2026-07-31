import { getClickAdScriptSrc, MONETAG_DOMAIN } from "@/lib/ads/click-ads-config";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

/** Remove Monetag click-ad scripts injected by the loader. */
export function unloadClickAds(): void {
  if (typeof document === "undefined") return;

  document.getElementById(CLICK_AD_SCRIPT_ID)?.remove();
  document
    .querySelectorAll(`script[src*="${MONETAG_DOMAIN}"]`)
    .forEach((node) => node.remove());
}

/** Inject the Monetag invoke script once when ads should run. */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = CLICK_AD_SCRIPT_ID;
  script.src = getClickAdScriptSrc();
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";
  document.body.insertBefore(script, document.body.firstChild);
}
