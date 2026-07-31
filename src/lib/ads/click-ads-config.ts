/** Popunder zone #7275065 — script host from the publisher dashboard. */
export const CLICK_AD_DOMAIN = "unfolded-uncle.com";

/** Default zone id (path-embedded in the script URL; for docs / logging). */
export const CLICK_AD_ZONE_ID_DEFAULT = 7275065;

/** Default popunder script path (override via NEXT_PUBLIC_CLICK_AD_SCRIPT_SRC). */
export const CLICK_AD_SCRIPT_SRC_DEFAULT =
  `https://${CLICK_AD_DOMAIN}/c/Dn9G6.bi2x5/lRSAWsQL9oNJzcI-3/NyTfAG2qNZSR0y3uMNjscq1_MhDrYt5F`;

type RuntimeEnvWindow = Window & { __ENV?: Record<string, string | undefined> };

function readRuntimeEnv(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (window as RuntimeEnvWindow).__ENV?.[key]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function normalizeScriptSrc(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return CLICK_AD_SCRIPT_SRC_DEFAULT;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return CLICK_AD_SCRIPT_SRC_DEFAULT;
}

/** Popunder script URL — override with full URL or protocol-relative //host/... */
export function getClickAdScriptSrc(): string {
  const raw =
    readRuntimeEnv("NEXT_PUBLIC_CLICK_AD_SCRIPT_SRC") ||
    process.env.NEXT_PUBLIC_CLICK_AD_SCRIPT_SRC?.trim() ||
    CLICK_AD_SCRIPT_SRC_DEFAULT;
  return normalizeScriptSrc(raw);
}
