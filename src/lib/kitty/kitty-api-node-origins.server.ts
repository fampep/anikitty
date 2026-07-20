import "server-only";

import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";

/**
 * Real VPS IPv4 addresses — server-only. Never import this from client components.
 * Public traffic uses https://vps.anikitty.online (Cloudflare-proxied); these pins
 * are for health/failover only.
 */
const KITTY_NODE_ORIGIN_IPS: Record<KittyApiNodeId, string> = {
  primary: "176.125.240.251",
  "third-choice": "131.123.42.153",
  "fourth-choice": "23.111.15.143",
  "fifth-choice": "94.75.223.124",
  "sixth-choice": "184.107.88.54",
};

export function getKittyApiNodeOriginIp(id: KittyApiNodeId): string {
  return KITTY_NODE_ORIGIN_IPS[id];
}

/**
 * Server-side origin that pins traffic to one VPS (bypasses Cloudflare).
 * Never surface this in the UI or client bundle.
 */
export function getKittyApiNodeDirectUrl(id: KittyApiNodeId): string {
  return `http://${getKittyApiNodeOriginIp(id)}`;
}

/** Match a probe/benchmark origin string to a node via its private IP. */
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
  const entry = Object.entries(KITTY_NODE_ORIGIN_IPS).find(([, value]) => value === ip);
  return (entry?.[0] as KittyApiNodeId | undefined) ?? null;
}
