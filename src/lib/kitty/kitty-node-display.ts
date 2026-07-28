/** Flags keyed by location label so node geo changes don’t leave stale country icons. */
const LOCATION_FLAGS: Record<string, string> = {
  Germany: "🇩🇪",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  "Zug, Switzerland": "🇨🇭",
  Netherlands: "🇳🇱",
  Bulgaria: "🇧🇬",
  Singapore: "🇸🇬",
  Canada: "🇨🇦",
  "Montreal, Canada": "🇨🇦",
};

/** Country flag emoji for a KittyAPI location label, or null if unknown. */
export function flagForKittyLocation(location: string): string | null {
  const exact = LOCATION_FLAGS[location];
  if (exact) return exact;
  const match = Object.entries(LOCATION_FLAGS).find(
    ([key]) => key !== location && location.includes(key),
  );
  return match?.[1] ?? null;
}

export function formatKittyPingMs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return `${Math.round(ms)} ms`;
}

export function formatKittyBandwidthMbps(
  mbps: number | null | undefined,
): string | null {
  if (mbps == null || !Number.isFinite(mbps)) return null;
  const value = mbps >= 10 ? Math.round(mbps) : mbps.toFixed(1);
  return `${value} Mbps`;
}
