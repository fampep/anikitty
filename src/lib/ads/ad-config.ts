/** Adcash display/banner ads — zone ID from Coolify / env (do not hardcode). */
export const ADCASH_LIB_SRC = "https://acscdn.com/script/aclib.js";
export const ADCASH_LIB_SCRIPT_ID = "aclib";

/** Reserved slot size for in-content banner placements (728×90 leaderboard). */
export const SITE_BANNER_AD_WIDTH = 728;
export const SITE_BANNER_AD_HEIGHT = 90;

/**
 * Banner zone from NEXT_PUBLIC_ADCASH_BANNER_ZONE.
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
  return process.env.NEXT_PUBLIC_ADCASH_BANNER_ZONE?.trim() || "";
}
