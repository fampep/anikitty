import {
  CLICK_AD_DOMAIN,
  getClickAdScriptSrc,
  getClickAdZoneId,
} from "@/lib/ads/click-ads-config";

export const CLICK_AD_SCRIPT_ID = "anikitty-click-ads";

type AdScriptElement = HTMLScriptElement & {
  settings?: Record<string, unknown>;
};

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
 *
 * Mirrors the publisher dashboard snippet: append to `<body>` (falling back to
 * `<html>`) and carry the zone id on `data-zone` — this network reads the zone
 * from that attribute, not from the script URL, so it is required.
 */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const parent = document.body ?? document.documentElement;
  if (!parent) return;

  const script = document.createElement("script") as AdScriptElement;
  script.id = CLICK_AD_SCRIPT_ID;
  script.dataset.zone = getClickAdZoneId();
  script.src = getClickAdScriptSrc();
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";

  parent.appendChild(script);
}
