export type KittyApiNodeId = "primary" | "fallback" | "third-choice" | "fourth-choice";

export type KittyApiNodeMeta = {
  id: KittyApiNodeId;
  /** Display number in the proxy chooser (1 = Primary, 2 = Fallback, 3 = Third, 4 = Fourth). */
  index: number;
  label: string;
  ip: string;
  url: string;
  host: string;
  location: string;
  timezone: string;
  operator: string;
  note?: string;
};

/** Normalize an env-provided node origin into a clean `https://host` URL. */
function nodeUrl(envValue: string | undefined, fallback: string): string {
  const raw = (envValue && envValue.trim()) || fallback;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function nodeHost(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

// Proxy/cluster node origins are configurable via env so domains aren't
// hardcoded. Each falls back to the current default when its var is unset.
// NEXT_PUBLIC_* is inlined at build time, so set them as build args in Coolify.
const PRIMARY_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY, "https://kittyapi.92-119-165-226.sslip.io");
const FALLBACK_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FALLBACK, "https://kittyapi.176-125-240-251.sslip.io");
const THIRD_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_THIRD, "https://kittyapi.131-123-42-153.sslip.io");
const FOURTH_URL = nodeUrl(process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH, "https://kittyapi.23-111-15-143.sslip.io");

export const KITTY_API_NODES: readonly KittyApiNodeMeta[] = [
  {
    id: "primary",
    index: 1,
    label: "Switzerland",
    ip: "92.119.165.226",
    url: PRIMARY_URL,
    host: nodeHost(PRIMARY_URL),
    location: "Switzerland",
    timezone: "Europe/Zurich",
    operator: "LAIN / AS211507 (Julian Achter)",
    note:
      "RIPE WHOIS lists the operator in Ismaning, Germany, but the IP geolocates to Zug, CH (~47.17°N, 8.52°E).",
  },
  {
    id: "fallback",
    index: 2,
    label: "Sweden",
    ip: "176.125.240.251",
    url: FALLBACK_URL,
    host: nodeHost(FALLBACK_URL),
    location: "Sweden",
    timezone: "Europe/Stockholm",
    operator: "AlexHost SRL / AS200019",
    note:
      "AlexHost is a Moldova-based host (HQ Chisinau); this IP is geolocated to their Stockholm POP, not Moscow.",
  },
  {
    id: "third-choice",
    index: 3,
    label: "Bulgaria",
    ip: "131.123.42.153",
    url: THIRD_URL,
    host: nodeHost(THIRD_URL),
    location: "Bulgaria",
    timezone: "Europe/Sofia",
    operator: "Third cluster node",
  },
  {
    id: "fourth-choice",
    index: 4,
    label: "Singapore",
    ip: "23.111.15.143",
    url: FOURTH_URL,
    host: nodeHost(FOURTH_URL),
    location: "Singapore",
    timezone: "Asia/Singapore",
    operator: "Fourth cluster node",
  },
];

export const DEFAULT_KITTY_API_NODE_ID: KittyApiNodeId = "primary";

export function getKittyApiNode(id: KittyApiNodeId): KittyApiNodeMeta {
  return KITTY_API_NODES.find((node) => node.id === id) ?? KITTY_API_NODES[0]!;
}

export function getKittyApiNodeUrl(id: KittyApiNodeId): string {
  return getKittyApiNode(id).url.replace(/\/$/, "");
}

/** Map a KittyAPI cluster origin URL to our node id. */
export function resolveKittyNodeIdFromOrigin(origin: string | null | undefined): KittyApiNodeId | null {
  if (!origin?.trim()) return null;
  const normalized = origin.trim().replace(/\/$/, "");
  const match = KITTY_API_NODES.find((node) => node.url === normalized || node.host === normalized);
  return match?.id ?? null;
}

export function parseKittyNodeParam(value: string | null | undefined): KittyApiNodeId {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "fourth-choice" || normalized === "fourthchoice" || normalized === "4") {
    return "fourth-choice";
  }
  if (normalized === "third-choice" || normalized === "thirdchoice" || normalized === "3") {
    return "third-choice";
  }
  if (normalized === "fallback" || normalized === "secondary" || normalized === "2") {
    return "fallback";
  }
  if (normalized === "primary" || normalized === "main" || normalized === "1") {
    return "primary";
  }
  return DEFAULT_KITTY_API_NODE_ID;
}

export function isKittyApiNodeId(value: string): value is KittyApiNodeId {
  return KITTY_API_NODES.some((node) => node.id === value);
}

export type KittyNodePingResult = {
  id: KittyApiNodeId;
  pingMs: number | null;
  bandwidthMbps: number | null;
  ok: boolean;
};
