import {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNodeUrl,
  KITTY_API_NODES,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";

export type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
export {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNode,
  getKittyApiNodeUrl,
  isKittyApiNodeId,
  KITTY_API_NODES,
  parseKittyNodeParam,
  resolveKittyNodeIdFromOrigin,
} from "@/lib/kitty/kitty-api-nodes";

/** @deprecated Use getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID) */
export const DEFAULT_KITTY_API_BASE = getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID);

/** Paths that do not require an API key (see KittyAPI guide). */
const KITTY_PUBLIC_PATH_PREFIXES = ["/proxy/benchmark", "/proxy/speedtest"] as const;

export type KittyStreamPayload = {
  file: string;
  headers: Record<string, string>;
  download?: string | null;
  tracks?: Array<{ file?: string; url?: string; kind?: string; label?: string; default?: boolean }>;
  server?: string | null;
  error?: string;
};

function normalizeBase(base: string): string {
  return base.replace(/\/$/, "");
}

export function isKittyPublicPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const pathOnly = normalized.split("?")[0] ?? normalized;
  return KITTY_PUBLIC_PATH_PREFIXES.some((prefix) => pathOnly === prefix);
}

export function getKittyApiBases(): string[] {
  const envBase = process.env.KITTY_API_BASE?.trim();
  if (envBase) return [normalizeBase(envBase)];
  return KITTY_API_NODES.map((node) => getKittyApiNodeUrl(node.id));
}

export function getKittyApiBase(nodeId?: KittyApiNodeId): string {
  if (nodeId) return getKittyApiNodeUrl(nodeId);
  const envBase = process.env.KITTY_API_BASE?.trim();
  if (envBase) return normalizeBase(envBase);
  return getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID);
}

export function kittyApiPath(path: string, base?: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base ?? getKittyApiBase()}${normalized}`;
}

export type KittyApiFetchOptions = {
  nodeId?: KittyApiNodeId;
  /** Skip API key headers even on protected routes. */
  skipAuth?: boolean;
};

function resolveKittyApiKey(): string | undefined {
  return process.env.KITTY_API_KEY?.trim() || undefined;
}

/** Auth via header only — never query params (KittyAPI guide). */
function kittyAuthHeaders(apiKey: string | undefined): HeadersInit {
  const key = apiKey?.trim();
  if (!key) return {};
  return {
    Authorization: `Bearer ${key}`,
    "X-API-Key": key,
  };
}

function mergeKittyFetchInit(path: string, init?: RequestInit, skipAuth?: boolean): RequestInit {
  if (skipAuth || isKittyPublicPath(path)) return init ?? {};

  const headers = new Headers(init?.headers);
  const auth = kittyAuthHeaders(resolveKittyApiKey());
  for (const [name, value] of Object.entries(auth)) {
    if (value && !headers.has(name)) headers.set(name, value);
  }

  return { ...init, headers };
}

/** Fetch KittyAPI on a single node (no automatic failover). */
export async function kittyApiFetch(
  path: string,
  init?: RequestInit,
  opts?: KittyApiFetchOptions,
): Promise<Response> {
  const nodeId = opts?.nodeId ?? DEFAULT_KITTY_API_NODE_ID;
  const base = getKittyApiBase(nodeId);
  return fetch(kittyApiPath(path, base), mergeKittyFetchInit(path, init, opts?.skipAuth));
}

export function kittyStreamHeaders(): HeadersInit {
  return kittyAuthHeaders(resolveKittyApiKey());
}

export function kittyApiHeaders(): HeadersInit {
  return kittyAuthHeaders(resolveKittyApiKey());
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

/** GET /auto/stream?q=&ep=&dub= — provider auto-fallback when stream-direct fails. */
export function buildKittyAutoStreamPath(opts: {
  anilistId: number | string;
  episode: number | string;
  dub: boolean;
}): string {
  const params = new URLSearchParams({
    q: String(opts.anilistId),
    ep: String(opts.episode),
    dub: opts.dub ? "true" : "false",
  });
  return `/auto/stream?${params.toString()}`;
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

export function parseKittyStreamJson(
  data: unknown,
  ok: boolean,
): KittyStreamPayload | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const file = typeof row.file === "string" ? row.file.trim() : "";
  if (!ok || !file) return null;

  return {
    file,
    headers: (row.headers ?? {}) as Record<string, string>,
    download: typeof row.download === "string" ? row.download : null,
    tracks: Array.isArray(row.tracks) ? row.tracks : undefined,
    server:
      typeof row.server === "string"
        ? row.server
        : typeof row.serverName === "string"
          ? row.serverName
          : null,
    error:
      typeof row.error === "string"
        ? row.error
        : typeof row.message === "string"
          ? row.message
          : undefined,
  };
}

export function buildKittyHealthPath(): string {
  return "/health";
}

export type KittyBenchmarkNode = {
  origin?: string;
  online?: boolean;
  latencyMs?: number;
  bandwidthMbps?: number;
  speedtestUrl?: string;
};

export type KittyBenchmarkResponse = {
  recommended?: string;
  nodes?: KittyBenchmarkNode[];
};

export function buildKittyBenchmarkPath(refresh = true): string {
  return refresh ? "/proxy/benchmark?refresh=1" : "/proxy/benchmark";
}

export function buildKittySpeedtestPath(bytes = 65_536): string {
  return `/proxy/speedtest?bytes=${bytes}`;
}
