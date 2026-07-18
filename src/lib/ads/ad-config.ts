/** Adcash ads — popunder zone from env, with publisher default fallback. */
export const ADCASH_LIB_SRC = "https://acscdn.com/script/aclib.js";
export const ADCASH_LIB_SCRIPT_ID = "aclib";

/** Default Adcash runPop zone (override via NEXT_PUBLIC_ADCASH_POP_ZONE). */
export const ADCASH_POP_ZONE_DEFAULT = "11731878";

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
