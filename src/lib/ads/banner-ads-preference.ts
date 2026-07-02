import {
  BANNER_AD_CONTAINER_ID,
  BANNER_AD_SCRIPT_ID,
  BANNER_AD_SCRIPT_SRC,
} from "@/lib/ads/banner-ads-config";

/** Remove banner ad script and clear the placement container. */
export function unloadBannerAds(): void {
  if (typeof document === "undefined") return;

  document.getElementById(BANNER_AD_SCRIPT_ID)?.remove();
  document
    .querySelectorAll('script[src*="effectivecpmnetwork.com"]')
    .forEach((node) => node.remove());

  const container = document.getElementById(BANNER_AD_CONTAINER_ID);
  container?.replaceChildren();
}

/** Inject the banner ad script once the placement container is mounted. */
export function loadBannerAds(): void {
  if (typeof document === "undefined") return;
  if (!document.getElementById(BANNER_AD_CONTAINER_ID)) return;
  if (document.getElementById(BANNER_AD_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = BANNER_AD_SCRIPT_ID;
  script.src = BANNER_AD_SCRIPT_SRC;
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  document.body.appendChild(script);
}
