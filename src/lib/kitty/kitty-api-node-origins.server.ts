import "server-only";

import {
  KITTY_API_NODE_ORIGIN_IPS,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";

/**
 * Real VPS IPv4 addresses — re-exported from the shared node registry.
 * Playback and API fetches pin to these static IPs (no Cloudflare hop).
 */
export function getKittyApiNodeOriginIp(id: KittyApiNodeId): string {
  return KITTY_API_NODE_ORIGIN_IPS[id];
}

/** Server-side origin that pins traffic to one VPS static IP. */
export function getKittyApiNodeDirectUrl(id: KittyApiNodeId): string {
  return `http://${getKittyApiNodeOriginIp(id)}`;
}

/** Match a probe/benchmark origin string to a node via its static IP. */
export function resolveKittyNodeIdFromOriginIp(origin: string | null | undefined): KittyApiNodeId | null {
  if (!origin?.trim()) return null;
  const lower = origin.trim().toLowerCase();
  const sslip = lower.match(/kittyapi\.(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.sslip\.io/);
  const ip = sslip
    ? `${sslip[1]}.${sslip[2]}.${sslip[3]}.${sslip[4]}`
    : lower.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)?.[1] ?? null;
  if (!ip) return null;
  // Retired Switzerland IP — treat as gone (do not map to a live node).
  if (ip === "92.119.165.226") return null;
  const entry = Object.entries(KITTY_API_NODE_ORIGIN_IPS).find(([, value]) => value === ip);
  return (entry?.[0] as KittyApiNodeId | undefined) ?? null;
}
