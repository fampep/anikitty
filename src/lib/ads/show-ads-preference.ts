import {
  CLICK_AD_DOMAIN,
  getClickAdScriptSrc,
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
 * Mirrors the publisher dashboard snippet (settings + insertBefore last script).
 */
export function loadClickAds(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(CLICK_AD_SCRIPT_ID)) return;

  const scripts = document.scripts;
  const last = scripts.length > 0 ? scripts[scripts.length - 1] : null;
  const parent = last?.parentNode ?? document.head ?? document.body;
  if (!parent) return;

  const script = document.createElement("script") as AdScriptElement;
  script.id = CLICK_AD_SCRIPT_ID;
  script.settings = {};
  script.src = getClickAdScriptSrc();
  script.async = true;
  script.type = "text/javascript";
  script.referrerPolicy = "no-referrer-when-downgrade";

  if (last?.parentNode === parent) {
    parent.insertBefore(script, last);
  } else {
    parent.appendChild(script);
  }
}
