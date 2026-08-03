/** Popunder script host from the publisher dashboard. */
export const CLICK_AD_DOMAIN = "al5sm.com";

/**
 * Zone id. This network takes it as a `data-zone` attribute on the script tag
 * rather than embedding it in the URL, so the loader must set it explicitly.
 */
export const CLICK_AD_ZONE_ID_DEFAULT = "11267140";

/** Default popunder script path (override via NEXT_PUBLIC_CLICK_AD_SCRIPT_SRC). */
export const CLICK_AD_SCRIPT_SRC_DEFAULT = `https://${CLICK_AD_DOMAIN}/tag.min.js`;

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

/** Zone id set as `data-zone` on the injected script. */
export function getClickAdZoneId(): string {
  return (
    readRuntimeEnv("NEXT_PUBLIC_CLICK_AD_ZONE_ID") ||
    process.env.NEXT_PUBLIC_CLICK_AD_ZONE_ID?.trim() ||
    CLICK_AD_ZONE_ID_DEFAULT
  );
}
