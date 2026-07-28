export type KittyApiNodeId =
  | "primary"
  | "third-choice"
  | "fourth-choice"
  | "fifth-choice"
  | "sixth-choice"
  | "seventh-choice";

export type KittyApiNodeMeta = {
  id: KittyApiNodeId;
  /** Display number in the DNS chooser (1 = Sweden, 2 = …). */
  index: number;
  label: string;
  /**
   * Public Cloudflare-proxied origin (`https://{dnsSlug}.anikitty.online`).
   * Never a bare IPv4 — origin IPs stay server-only.
   * Note: must be a single-label subdomain (not `*.vps.*`) so Universal SSL covers it.
   */
  url: string;
  /** Public hostname only (no IP). */
  host: string;
  /** DNS label under `anikitty.online`. */
  dnsSlug: string;
  location: string;
  timezone: string;
};

/**
 * Decommissioned cluster hosts that must never be used for minting/playback,
 * even if a stale Coolify `NEXT_PUBLIC_KITTY_NODE_*` build arg still points at them.
 */
const REMOVED_KITTY_HOST_MARKERS = [
  "45-150-111-153",
  "45.150.111.153",
  "92-119-165-226",
  "92.119.165.226",
  "176-125-240-251",
  "176.125.240.251",
] as const;

/**
 * Legacy shared hostname — load-balanced A records; prefer per-location DNS
 * for pinned routing.
 */
export const PUBLIC_KITTY_API_HOST = "vps.anikitty.online";
export const PUBLIC_KITTY_API_ORIGIN = `https://${PUBLIC_KITTY_API_HOST}`;
/** Zone for location DNS labels (`sweden.anikitty.online`, …). */
export const PUBLIC_KITTY_DNS_ZONE = "anikitty.online";

/** Location DNS slug → node id (Cloudflare A → origin IP, proxied). */
export const KITTY_API_NODE_DNS_SLUGS: Record<KittyApiNodeId, string> = {
  primary: "sweden",
  "third-choice": "bulgaria",
  "fourth-choice": "singapore",
  "fifth-choice": "netherlands",
  "sixth-choice": "canada",
  "seventh-choice": "switzerland",
};

export function kittyApiNodePublicHost(id: KittyApiNodeId): string {
  return `${KITTY_API_NODE_DNS_SLUGS[id]}.${PUBLIC_KITTY_DNS_ZONE}`;
}

export function kittyApiNodePublicUrl(id: KittyApiNodeId): string {
  return `https://${kittyApiNodePublicHost(id)}`;
}

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

/**
 * Resolve a public node origin. Env overrides must be location DNS names (or the
 * shared `vps.anikitty.online` host) — bare IPs and sslip hosts are rejected.
 */
function nodeUrl(envValue: string | undefined, nodeId: KittyApiNodeId): string {
  const fallback = kittyApiNodePublicUrl(nodeId);
  const raw = (envValue && envValue.trim()) || fallback;
  const trimmed = raw.trim().replace(/\/+$/, "");
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (isRemovedKittyApiHost(withProto) || isKittySslipHost(withProto)) {
    return fallback;
  }
  try {
    const host = new URL(withProto).hostname.toLowerCase();
    // Reject bare IPv4 in public config — never ship origin IPs to the browser.
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return fallback;
    if (host === PUBLIC_KITTY_API_HOST) return fallback;
    // Accept any `*.vps.anikitty.online` / `*.anikitty.online` override.
    if (host.endsWith(".anikitty.online") || host === "anikitty.online") {
      return `https://${host}`;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function nodeHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

/** Extract an IPv4 from a URL/host (including legacy `kittyapi.A-B-C-D.sslip.io`). */
export function extractKittyOriginIpv4(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const lower = value.trim().toLowerCase();
  const sslip = lower.match(/kittyapi\.(\d{1,3})-(\d{1,3})-(\d{1,3})-(\d{1,3})\.sslip\.io/);
  if (sslip) return `${sslip[1]}.${sslip[2]}.${sslip[3]}.${sslip[4]}`;
  const bare = lower.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  return bare?.[1] ?? null;
}

const PRIMARY_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY, "primary");
const THIRD_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_THIRD, "third-choice");
const FOURTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH, "fourth-choice");
const FIFTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FIFTH, "fifth-choice");
const SIXTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_SIXTH, "sixth-choice");
const SEVENTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_SEVENTH, "seventh-choice");

export const KITTY_API_NODES: readonly KittyApiNodeMeta[] = [
  {
    id: "primary",
    index: 1,
    label: "Sweden",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS.primary,
    url: PRIMARY_URL,
    host: nodeHost(PRIMARY_URL),
    location: "Sweden",
    timezone: "Europe/Stockholm",
  },
  {
    id: "third-choice",
    index: 2,
    label: "Bulgaria",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS["third-choice"],
    url: THIRD_URL,
    host: nodeHost(THIRD_URL),
    location: "Bulgaria",
    timezone: "Europe/Sofia",
  },
  {
    id: "fourth-choice",
    index: 3,
    label: "Singapore",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS["fourth-choice"],
    url: FOURTH_URL,
    host: nodeHost(FOURTH_URL),
    location: "Singapore",
    timezone: "Asia/Singapore",
  },
  {
    id: "fifth-choice",
    index: 4,
    label: "Netherlands",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS["fifth-choice"],
    url: FIFTH_URL,
    host: nodeHost(FIFTH_URL),
    location: "Netherlands",
    timezone: "Europe/Amsterdam",
  },
  {
    id: "sixth-choice",
    index: 5,
    label: "Canada",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS["sixth-choice"],
    url: SIXTH_URL,
    host: nodeHost(SIXTH_URL),
    location: "Montreal, Canada",
    timezone: "America/Toronto",
  },
  {
    id: "seventh-choice",
    index: 6,
    label: "Switzerland",
    dnsSlug: KITTY_API_NODE_DNS_SLUGS["seventh-choice"],
    url: SEVENTH_URL,
    host: nodeHost(SEVENTH_URL),
    location: "Switzerland",
    timezone: "Europe/Zurich",
  },
];

/** Default preferred DNS node when the user has not picked one (Sweden). */
export const DEFAULT_KITTY_API_NODE_ID: KittyApiNodeId = "primary";

/** Legacy node ids that may still be stored in local settings / prefs. */
const LEGACY_KITTY_NODE_ALIASES: Record<string, KittyApiNodeId> = {
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
  "seventh-choice": "seventh-choice",
};

export function resolveKittyNodeIdFromOrigin(origin: string | null | undefined): KittyApiNodeId | null {
  if (!origin?.trim()) return null;
  const trimmed = origin.trim();
  const aliased = API_NODE_ID_ALIASES[trimmed.toLowerCase()];
  if (aliased) return aliased;

  const normalized = normalizeNodeOrigin(trimmed);
  const match = KITTY_API_NODES.find(
    (node) =>
      normalizeNodeOrigin(node.url) === normalized ||
      node.host.toLowerCase() === normalized ||
      `${node.dnsSlug}.${PUBLIC_KITTY_DNS_ZONE}` === normalized,
  );
  if (match) return match.id;

  // Do not map bare IPs on the client — origin IPs are server-only.
  return null;
}

export function parseKittyNodeParam(value: string | null | undefined): KittyApiNodeId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_KITTY_API_NODE_ID;

  const aliased = LEGACY_KITTY_NODE_ALIASES[normalized];
  if (aliased) return aliased;

  // Location / DNS slug aliases.
  for (const [id, slug] of Object.entries(KITTY_API_NODE_DNS_SLUGS) as [KittyApiNodeId, string][]) {
    if (normalized === slug || normalized === `${slug}.vps` || normalized.startsWith(`${slug}.`)) {
      return id;
    }
  }

  if (normalized === "seventh-choice" || normalized === "seventhchoice" || normalized === "7") {
    return "seventh-choice";
  }
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
    return "third-choice";
  }
  if (normalized === "fallback" || normalized === "secondary") {
    return "primary";
  }
  if (normalized === "primary" || normalized === "main" || normalized === "1" || normalized === "sweden") {
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
