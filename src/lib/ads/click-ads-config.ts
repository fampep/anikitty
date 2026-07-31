/** Monetag (Clickadu) publisher zone — see dashboard → Sites → zone ID. */
export const MONETAG_DOMAIN = "3nbf4.com";

/** Default OnClick / popunder zone (override via NEXT_PUBLIC_MONETAG_ZONE). */
export const CLICK_AD_ZONE_ID_DEFAULT = 11229456;

type RuntimeEnvWindow = Window & { __ENV?: Record<string, string | undefined> };

function readRuntimeEnv(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return (window as RuntimeEnvWindow).__ENV?.[key]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function getMonetagZoneId(): number {
  const raw =
    readRuntimeEnv("NEXT_PUBLIC_MONETAG_ZONE") ||
    process.env.NEXT_PUBLIC_MONETAG_ZONE?.trim() ||
    String(CLICK_AD_ZONE_ID_DEFAULT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : CLICK_AD_ZONE_ID_DEFAULT;
}

/** OnClick / popunder tag — Monetag dashboard “paste below &lt;head&gt;”. */
export function getClickAdScriptSrc(): string {
  return `https://${MONETAG_DOMAIN}/${getMonetagZoneId()}/invoke.js`;
}
