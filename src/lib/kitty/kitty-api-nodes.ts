export type KittyApiNodeId = "primary" | "fallback";

export type KittyApiNodeMeta = {
  id: KittyApiNodeId;
  /** Display number in the proxy chooser (1 = Primary, 2 = Fallback). */
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

export const KITTY_API_NODES: readonly KittyApiNodeMeta[] = [
  {
    id: "primary",
    index: 1,
    label: "Primary",
    ip: "92.119.165.226",
    url: "https://kittyapi.92-119-165-226.sslip.io",
    host: "kittyapi.92-119-165-226.sslip.io",
    location: "Zug, Switzerland",
    timezone: "Europe/Zurich",
    operator: "LAIN / AS211507 (Julian Achter)",
    note:
      "RIPE WHOIS lists the operator in Ismaning, Germany, but the IP geolocates to Zug, CH (~47.17°N, 8.52°E).",
  },
  {
    id: "fallback",
    index: 2,
    label: "Fallback",
    ip: "176.125.240.251",
    url: "https://kittyapi.176-125-240-251.sslip.io",
    host: "kittyapi.176-125-240-251.sslip.io",
    location: "Stockholm, Sweden",
    timezone: "Europe/Stockholm",
    operator: "AlexHost SRL / AS200019",
    note:
      "AlexHost is a Moldova-based host (HQ Chisinau); this IP is geolocated to their Stockholm POP, not Moscow.",
  },
] as const;

export const DEFAULT_KITTY_API_NODE_ID: KittyApiNodeId = "primary";

export function getKittyApiNode(id: KittyApiNodeId): KittyApiNodeMeta {
  return KITTY_API_NODES.find((node) => node.id === id) ?? KITTY_API_NODES[0]!;
}

export function getKittyApiNodeUrl(id: KittyApiNodeId): string {
  return getKittyApiNode(id).url.replace(/\/$/, "");
}

export function parseKittyNodeParam(value: string | null | undefined): KittyApiNodeId {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "fallback" || normalized === "2") return "fallback";
  if (normalized === "primary" || normalized === "1") return "primary";
  return DEFAULT_KITTY_API_NODE_ID;
}

export function isKittyApiNodeId(value: string): value is KittyApiNodeId {
  return value === "primary" || value === "fallback";
}

export type KittyNodePingResult = {
  id: KittyApiNodeId;
  pingMs: number | null;
  bandwidthMbps: number | null;
  ok: boolean;
};
