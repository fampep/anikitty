import "server-only";

import {
  KITTY_API_NODE_DNS_SLUGS,
  KITTY_API_NODES,
  PUBLIC_KITTY_API_HOST,
  PUBLIC_KITTY_DNS_ZONE,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";

/**
 * Real VPS IPv4 addresses — server-only. Never import this module from client
 * components; browser traffic uses Cloudflare-proxied location DNS names.
 */
export const KITTY_API_NODE_ORIGIN_IPS: Record<KittyApiNodeId, string> = {
  primary: "91.208.206.177",
  "third-choice": "131.123.42.153",
  "seventh-choice": "92.119.165.226",
};

const RETIRED_ORIGIN_IPS = new Set([
  "45.150.111.153",
  "132.243.174.157",
  "176.125.240.251",
  "143.246.195.251",
  "23.111.15.143",
  "94.75.223.124",
  "184.107.88.54",
]);

export function getKittyApiNodeOriginIp(id: KittyApiNodeId): string {
  return KITTY_API_NODE_ORIGIN_IPS[id];
}

/** Server-side origin that pins traffic to one VPS static IP (no CF hop). */
export function getKittyApiNodeDirectUrl(id: KittyApiNodeId): string {
  return `http://${getKittyApiNodeOriginIp(id)}`;
}

function resolveNodeIdFromKittyHostname(hostname: string): KittyApiNodeId | null {
  const host = hostname.toLowerCase();
  if (host === PUBLIC_KITTY_API_HOST) return "primary";
  for (const node of KITTY_API_NODES) {
    if (host === node.host.toLowerCase()) return node.id;
  }
  for (const [id, slug] of Object.entries(KITTY_API_NODE_DNS_SLUGS) as [
    KittyApiNodeId,
    string,
  ][]) {
    if (host === `${slug}.${PUBLIC_KITTY_DNS_ZONE}`) return id;
  }
  // Already a known origin IP — keep pinning to that node.
  const byIp = Object.entries(KITTY_API_NODE_ORIGIN_IPS).find(([, ip]) => ip === host);
  return (byIp?.[0] as KittyApiNodeId | undefined) ?? null;
}

/**
 * Rewrite Cloudflare-proxied KittyAPI URLs onto the matching origin IP.
 * AniKitty server fetches (HLS proxy) must skip CF Browser Integrity (1010),
 * which blocks Node/undici UA on `*.anikitty.online` /proxy paths.
 */
export function rewriteKittyApiUrlToDirectOrigin(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const nodeId = resolveNodeIdFromKittyHostname(parsed.hostname);
    if (!nodeId) return trimmed;
    const direct = new URL(getKittyApiNodeDirectUrl(nodeId));
    parsed.protocol = direct.protocol;
    parsed.host = direct.host;
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

/** Match a probe/benchmark origin string to a node via its static IP. */
export function resolveKittyNodeIdFromOriginIp(origin: string | null | undefined): KittyApiNodeId | null {
  if (!origin?.trim()) return null;
  const lower = origin.trim().toLowerCase();
  const sslip = lower.match(/kittyapi\.(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.sslip\.io/);
  const ip = sslip
    ? `${sslip[1]}.${sslip[2]}.${sslip[3]}.${sslip[4]}`
    : lower.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)?.[1] ?? null;
  if (!ip || RETIRED_ORIGIN_IPS.has(ip)) return null;
  const entry = Object.entries(KITTY_API_NODE_ORIGIN_IPS).find(([, value]) => value === ip);
  return (entry?.[0] as KittyApiNodeId | undefined) ?? null;
}
