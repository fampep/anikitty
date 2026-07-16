/** Adcash ads — zones from env, with publisher default fallbacks. */
export const ADCASH_LIB_SRC = "https://acscdn.com/script/aclib.js";
export const ADCASH_LIB_SCRIPT_ID = "aclib";

/** Default Adcash runBanner zone (override via NEXT_PUBLIC_ADCASH_BANNER_ZONE). */
export const ADCASH_BANNER_ZONE_DEFAULT = "11731546";

/** Default Adcash runPop zone (override via NEXT_PUBLIC_ADCASH_POP_ZONE). */
export const ADCASH_POP_ZONE_DEFAULT = "11731878";

/** Reserved slot size for in-content banner placements (728×90 leaderboard). */
export const SITE_BANNER_AD_WIDTH = 728;
export const SITE_BANNER_AD_HEIGHT = 90;

type RuntimeEnvWindow = Window & { __ENV?: Record<string, string | undefined> };

function readRuntimeEnv(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    // next-runtime-env injects __ENV on the client via PublicEnvScript.
    return (window as RuntimeEnvWindow).__ENV?.[key]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Banner zone from NEXT_PUBLIC_ADCASH_BANNER_ZONE, else ADCASH_BANNER_ZONE_DEFAULT.
 * Prefer runtime env (Coolify) via next-runtime-env when available.
 */
export function getAdcashBannerZoneId(): string {
  return (
    readRuntimeEnv("NEXT_PUBLIC_ADCASH_BANNER_ZONE") ||
    process.env.NEXT_PUBLIC_ADCASH_BANNER_ZONE?.trim() ||
    ADCASH_BANNER_ZONE_DEFAULT
  );
}

/**
 * Popunder zone from NEXT_PUBLIC_ADCASH_POP_ZONE, else ADCASH_POP_ZONE_DEFAULT.
 * Prefer runtime env (Coolify) via next-runtime-env when available.
 */
export function getAdcashPopZoneId(): string {
  return (
    readRuntimeEnv("NEXT_PUBLIC_ADCASH_POP_ZONE") ||
    process.env.NEXT_PUBLIC_ADCASH_POP_ZONE?.trim() ||
    ADCASH_POP_ZONE_DEFAULT
  );
}
