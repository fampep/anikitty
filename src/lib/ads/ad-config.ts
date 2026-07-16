/** Adcash display/banner ads — zone from env, with publisher default fallback. */
export const ADCASH_LIB_SRC = "https://acscdn.com/script/aclib.js";
export const ADCASH_LIB_SCRIPT_ID = "aclib";

/** Default Adcash runBanner zone (override via NEXT_PUBLIC_ADCASH_BANNER_ZONE). */
export const ADCASH_BANNER_ZONE_DEFAULT = "11731546";

/** Reserved slot size for in-content banner placements (728×90 leaderboard). */
export const SITE_BANNER_AD_WIDTH = 728;
export const SITE_BANNER_AD_HEIGHT = 90;

/**
 * Banner zone from NEXT_PUBLIC_ADCASH_BANNER_ZONE, else ADCASH_BANNER_ZONE_DEFAULT.
 * Prefer runtime env (Coolify) via next-runtime-env when available.
 */
export function getAdcashBannerZoneId(): string {
  if (typeof window !== "undefined") {
    try {
      // next-runtime-env injects __ENV on the client via PublicEnvScript.
      const runtime = (window as Window & { __ENV?: Record<string, string | undefined> })
        .__ENV?.NEXT_PUBLIC_ADCASH_BANNER_ZONE;
      if (runtime?.trim()) return runtime.trim();
    } catch {
      // ignore
    }
  }
  return process.env.NEXT_PUBLIC_ADCASH_BANNER_ZONE?.trim() || ADCASH_BANNER_ZONE_DEFAULT;
}
