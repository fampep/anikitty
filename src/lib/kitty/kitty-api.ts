export type KittyApiNode = {
  url: string;
  nodeId: "primary" | "secondary";
};

export const KITTY_API_NODES: KittyApiNode[] = [
  { url: "https://kittyapi.176-125-240-251.sslip.io", nodeId: "primary" },
  { url: "https://kittyapi.92-119-165-226.sslip.io", nodeId: "secondary" },
];

export const DEFAULT_KITTY_API_BASE = KITTY_API_NODES[0]!.url;

const HEALTH_TTL_MS = 60_000;
const HEALTH_TIMEOUT_MS = 3_000;

let orderedBasesCache: string[] | null = null;
let orderedBasesAt = 0;

function normalizeBase(base: string): string {
  return base.replace(/\/$/, "");
}

export function getKittyApiBases(): string[] {
  const envBase = process.env.KITTY_API_BASE?.trim();
  if (envBase) return [normalizeBase(envBase)];
  return KITTY_API_NODES.map((node) => normalizeBase(node.url));
}

export function getKittyApiBase(): string {
  return getKittyApiBases()[0]!;
}

async function kittyNodeHealthy(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function getOrderedKittyApiBases(): Promise<string[]> {
  const bases = getKittyApiBases();
  if (bases.length <= 1) return bases;

  const now = Date.now();
  if (orderedBasesCache && now - orderedBasesAt < HEALTH_TTL_MS) {
    return orderedBasesCache;
  }

  const checks = await Promise.all(
    bases.map(async (base) => ({ base, ok: await kittyNodeHealthy(base) })),
  );

  orderedBasesCache = [
    ...checks.filter((row) => row.ok).map((row) => row.base),
    ...checks.filter((row) => !row.ok).map((row) => row.base),
  ];
  orderedBasesAt = now;
  return orderedBasesCache;
}

export function kittyApiPath(path: string, base?: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base ?? getKittyApiBase()}${normalized}`;
}

/** Fetch KittyAPI with automatic failover across peer nodes. */
export async function kittyApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const bases = await getOrderedKittyApiBases();
  let lastResponse: Response | null = null;

  for (const base of bases) {
    try {
      const res = await fetch(kittyApiPath(path, base), init);
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      lastResponse = res;
    } catch {
      // try next node
    }
  }

  if (lastResponse) return lastResponse;
  throw new Error("KittyAPI unreachable");
}

/** Stream/scrape routes — KittyAPI no longer requires an API key. */
export function kittyStreamHeaders(): HeadersInit {
  return {};
}

/** Auth headers for Kitty routes that still require a key (e.g. /subs). */
export function kittyApiHeaders(): HeadersInit {
  const apiKey = process.env.KITTY_API_KEY;
  if (!apiKey) return {};
  return {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };
}

export function buildKittyStreamDirectPath(opts: {
  provider: string;
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });

  const title = opts.title?.trim();
  if (title) params.set("title", title);

  return `/provider/${encodeURIComponent(opts.provider)}/stream-direct?${params.toString()}`;
}

export function buildKittyStreamDirectUrl(opts: {
  provider: string;
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  return kittyApiPath(buildKittyStreamDirectPath(opts));
}
