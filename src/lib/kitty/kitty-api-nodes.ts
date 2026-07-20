export type KittyApiNodeId =
  | "primary"
  | "third-choice"
  | "fourth-choice"
  | "fifth-choice"
  | "sixth-choice";

export type KittyApiNodeMeta = {
  id: KittyApiNodeId;
  /** Display number in the proxy chooser (1 = Primary, 2 = …). */
  index: number;
  label: string;
  /** Direct static-IP origin for this node (`http://A.B.C.D`). */
  url: string;
  host: string;
  location: string;
  timezone: string;
};

/**
 * Decommissioned cluster hosts that must never be used for minting/playback,
 * even if a stale Coolify `NEXT_PUBLIC_KITTY_NODE_*` build arg still points at them.
 */
const REMOVED_KITTY_HOST_MARKERS = [
  "45-150-111-153", // retired Bulgaria IP (replaced by 131.123.42.153)
  "45.150.111.153",
  "92-119-165-226", // retired Switzerland / secondary
  "92.119.165.226",
] as const;

/**
 * Legacy Cloudflare shared hostname — still accepted when rewriting old URLs,
 * but playback no longer routes through it.
 */
export const PUBLIC_KITTY_API_HOST = "vps.anikitty.online";
export const PUBLIC_KITTY_API_ORIGIN = `https://${PUBLIC_KITTY_API_HOST}`;

/** Static origin IPv4 per cluster node (source of truth for direct routing). */
export const KITTY_API_NODE_ORIGIN_IPS: Record<KittyApiNodeId, string> = {
  primary: "176.125.240.251",
  "third-choice": "131.123.42.153",
  "fourth-choice": "23.111.15.143",
  "fifth-choice": "94.75.223.124",
  "sixth-choice": "184.107.88.54",
};

/** True when a URL/host belongs to a removed KittyAPI node. */
export function isRemovedKittyApiHost(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const lower = value.trim().toLowerCase();
  return REMOVED_KITTY_HOST_MARKERS.some((marker) => lower.includes(marker));
}

/** True when a value is an old free sslip hostname (embeds the origin IP). */
export function isKittySslipHost(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /(?:^|[/.])kittyapi\.[\d-]+\.sslip\.io(?:\/|$)/i.test(value.trim());
}

function staticOriginUrl(ip: string): string {
  return `http://${ip}`;
}

/**
 * Resolve a node origin. Prefer static IPs. Stale Coolify sslip / removed hosts
 * fall back to the hard-coded IP for that slot.
 */
function nodeUrl(envValue: string | undefined, fallbackIp: string): string {
  const fallback = staticOriginUrl(fallbackIp);
  const raw = (envValue && envValue.trim()) || fallback;
  const trimmed = raw.trim().replace(/\/+$/, "");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  if (isRemovedKittyApiHost(withProto) || isKittySslipHost(withProto)) {
    return fallback;
  }
  try {
    const host = new URL(withProto).hostname.toLowerCase();
    // Shared CF hostname is not a pin — map to this node's static IP.
    if (host === PUBLIC_KITTY_API_HOST || host.endsWith(".anikitty.online")) {
      return fallback;
    }
    const bareIp = extractKittyOriginIpv4(host);
    if (bareIp) return staticOriginUrl(bareIp);
  } catch {
    return fallback;
  }
  return withProto;
}

function nodeHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

/** Extract an IPv4 from a URL/host (including `kittyapi.A-B-C-D.sslip.io`). */
export function extractKittyOriginIpv4(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const lower = value.trim().toLowerCase();
  const sslip = lower.match(/kittyapi\.(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.sslip\.io/);
  if (sslip) return `${sslip[1]}.${sslip[2]}.${sslip[3]}.${sslip[4]}`;
  const bare = lower.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  return bare?.[1] ?? null;
}

const PRIMARY_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY, KITTY_API_NODE_ORIGIN_IPS.primary);
const THIRD_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_THIRD, KITTY_API_NODE_ORIGIN_IPS["third-choice"]);
const FOURTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH, KITTY_API_NODE_ORIGIN_IPS["fourth-choice"]);
const FIFTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FIFTH, KITTY_API_NODE_ORIGIN_IPS["fifth-choice"]);
const SIXTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_SIXTH, KITTY_API_NODE_ORIGIN_IPS["sixth-choice"]);

export const KITTY_API_NODES: readonly KittyApiNodeMeta[] = [
  {
    id: "primary",
    index: 1,
    label: "Sweden",
    url: PRIMARY_URL,
    host: nodeHost(PRIMARY_URL),
    location: "Sweden",
    timezone: "Europe/Stockholm",
  },
  {
    id: "third-choice",
    index: 2,
    label: "Bulgaria",
    url: THIRD_URL,
    host: nodeHost(THIRD_URL),
    location: "Bulgaria",
    timezone: "Europe/Sofia",
  },
  {
    id: "fourth-choice",
    index: 3,
    label: "Singapore",
    url: FOURTH_URL,
    host: nodeHost(FOURTH_URL),
    location: "Singapore",
    timezone: "Asia/Singapore",
  },
  {
    id: "fifth-choice",
    index: 4,
    label: "Netherlands",
    url: FIFTH_URL,
    host: nodeHost(FIFTH_URL),
    location: "Netherlands",
    timezone: "Europe/Amsterdam",
  },
  {
    id: "sixth-choice",
    index: 5,
    label: "Canada",
    url: SIXTH_URL,
    host: nodeHost(SIXTH_URL),
    location: "Montreal, Canada",
    timezone: "America/Toronto",
  },
];

/** Default preferred node when the user has not picked one (Stockholm). */
export const DEFAULT_KITTY_API_NODE_ID: KittyApiNodeId = "primary";

/** Legacy node ids that may still be stored in local settings / prefs. */
const LEGACY_KITTY_NODE_ALIASES: Record<string, KittyApiNodeId> = {
  // Retired Switzerland node → Sweden
  secondary: "primary",
  fallback: "primary",
  main: "primary",
};

export function getKittyApiNode(id: KittyApiNodeId): KittyApiNodeMeta {
  return KITTY_API_NODES.find((node) => node.id === id) ?? KITTY_API_NODES[0]!;
}

export function getKittyApiNodeUrl(id: KittyApiNodeId): string {
  return getKittyApiNode(id).url.replace(/\/$/, "");
}

/** Strip protocol, case and trailing slashes so origins compare reliably. */
function normalizeNodeOrigin(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

/** API registry id → site node id (retired Switzerland `secondary` → primary). */
const API_NODE_ID_ALIASES: Record<string, KittyApiNodeId> = {
  primary: "primary",
  secondary: "primary",
  fallback: "primary",
  "third-choice": "third-choice",
  "fourth-choice": "fourth-choice",
  "fifth-choice": "fifth-choice",
  "sixth-choice": "sixth-choice",
};

export function resolveKittyNodeIdFromOrigin(origin: string | null | undefined): KittyApiNodeId | null {
  if (!origin?.trim()) return null;
  const trimmed = origin.trim();
  const aliased = API_NODE_ID_ALIASES[trimmed.toLowerCase()];
  if (aliased) return aliased;

  const normalized = normalizeNodeOrigin(trimmed);
  const match = KITTY_API_NODES.find(
    (node) => normalizeNodeOrigin(node.url) === normalized || node.host.toLowerCase() === normalized,
  );
  if (match) return match.id;

  const ip = extractKittyOriginIpv4(trimmed);
  if (!ip || ip === "92.119.165.226") return null;
  const byIp = (Object.entries(KITTY_API_NODE_ORIGIN_IPS) as [KittyApiNodeId, string][]).find(
    ([, value]) => value === ip,
  );
  return byIp?.[0] ?? null;
}

export function parseKittyNodeParam(value: string | null | undefined): KittyApiNodeId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_KITTY_API_NODE_ID;

  const aliased = LEGACY_KITTY_NODE_ALIASES[normalized];
  if (aliased) return aliased;

  if (normalized === "sixth-choice" || normalized === "sixthchoice" || normalized === "6") {
    return "sixth-choice";
  }
  if (normalized === "fifth-choice" || normalized === "fifthchoice" || normalized === "5") {
    return "fifth-choice";
  }
  if (normalized === "fourth-choice" || normalized === "fourthchoice" || normalized === "4") {
    return "fourth-choice";
  }
  if (
    normalized === "third-choice" ||
    normalized === "thirdchoice" ||
    normalized === "3" ||
    normalized === "2"
  ) {
    // "2" was Switzerland; remap to the next live node (Bulgaria).
    return "third-choice";
  }
  if (normalized === "fallback" || normalized === "secondary") {
    return "primary";
  }
  if (normalized === "primary" || normalized === "main" || normalized === "1") {
    return "primary";
  }
  return DEFAULT_KITTY_API_NODE_ID;
}

export function isKittyApiNodeId(value: string): value is KittyApiNodeId {
  return KITTY_API_NODES.some((node) => node.id === value);
}

/** `auto` / `race` — parallel probe across cluster nodes for the first working stream. */
export function isKittyNodeRaceParam(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "auto" || normalized === "race";
}

/** Cluster order for stream races / failover (not geo or ping sorted). */
export function kittyNodeRaceOrder(
  exclude: ReadonlySet<KittyApiNodeId> | readonly KittyApiNodeId[] = [],
): KittyApiNodeId[] {
  const skip = exclude instanceof Set ? exclude : new Set(exclude);
  return KITTY_API_NODES.map((n) => n.id).filter((id) => !skip.has(id));
}

/** Coerce a stored preference (including legacy ids) to a live node id. */
export function coerceKittyApiNodeId(value: string | null | undefined): KittyApiNodeId {
  if (!value?.trim()) return DEFAULT_KITTY_API_NODE_ID;
  if (isKittyApiNodeId(value)) return value;
  return parseKittyNodeParam(value);
}

export type KittyNodePingResult = {
  id: KittyApiNodeId;
  pingMs: number | null;
  bandwidthMbps: number | null;
  ok: boolean;
};
