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

export function isKittyPublicPath(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const pathOnly = normalized.split("?")[0] ?? normalized;
  return KITTY_PUBLIC_PATH_PREFIXES.some((prefix) => pathOnly === prefix);
}

/**
 * Signed KittyAPI media proxy (`/proxy?token=…` or `/proxy?url=…`).
 * Auth is embedded in the query string — never send Bearer / X-API-Key on these.
 */
export function isKittySignedProxyPath(pathOrUrl: string): boolean {
  try {
    const parsed = pathOrUrl.includes("://")
      ? new URL(pathOrUrl)
      : new URL(pathOrUrl, "https://kittyapi.local");
    const pathOnly = parsed.pathname.replace(/\/+$/, "") || "/";
    return pathOnly === "/proxy";
  } catch {
    const pathOnly = pathOrUrl.split("?")[0] ?? pathOrUrl;
    return pathOnly === "/proxy";
  }
}

function isKittyNoApiKeyPath(path: string): boolean {
  return isKittyPublicPath(path) || isKittySignedProxyPath(path);
}

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

/** True when the host belongs to a configured KittyAPI cluster node. */
export function isKittyApiHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (/^kittyapi\.[\d-]+\.sslip\.io$/i.test(lower)) return true;
  return KITTY_API_NODES.some((node) => node.host.toLowerCase() === lower);
}

/** Align stream URLs with the node base scheme (API may return http while base is https). */
export function normalizeKittyApiUrl(url: string, nodeId?: KittyApiNodeId): string {
  const kittyBase = getKittyApiBase(nodeId);
  if (!url.startsWith("http://") || !kittyBase.startsWith("https://")) return url;

  try {
    const parsed = new URL(url);
    if (isKittyApiHost(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

/** Resolve KittyAPI relative paths (e.g. `/proxy?token=…`) to absolute URLs on the active node. */
export function resolveKittyStreamUrl(file: string, nodeId?: KittyApiNodeId): string {
  const trimmed = file.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/")) {
    return normalizeKittyApiUrl(`${getKittyApiBase(nodeId)}${trimmed}`, nodeId);
  }

  return normalizeKittyApiUrl(trimmed, nodeId);
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

/** KittyAPI key from `KITTY_API_KEY` env (e.g. `akitty_cd32a8c2…`). Never use query params. */
export function resolveKittyApiKey(): string | undefined {
  const raw = process.env.KITTY_API_KEY?.trim();
  if (!raw) return undefined;
  const key = raw.replace(/^["']|["']$/g, "").trim();
  return key || undefined;
}

/** Auth headers for protected KittyAPI routes — `X-API-Key` plus Bearer (either works). */
export function kittyAuthHeaders(apiKey?: string): HeadersInit {
  const key = (apiKey ?? resolveKittyApiKey())?.trim();
  if (!key) return {};
  return {
    "X-API-Key": key,
    Authorization: `Bearer ${key}`,
  };
}

function mergeKittyFetchInit(path: string, init?: RequestInit, skipAuth?: boolean): RequestInit {
  if (skipAuth || isKittyNoApiKeyPath(path)) return init ?? {};

  const headers = new Headers(init?.headers);
  const auth = kittyAuthHeaders();
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

/** API key headers for KittyAPI JSON routes (search, stream-direct, etc.) — not for signed `/proxy?token=…` playback URLs. */
export function kittyStreamHeaders(): HeadersInit {
  return kittyAuthHeaders();
}

export function kittyApiHeaders(): HeadersInit {
  return kittyAuthHeaders();
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

/** VideoVib-style watch route: `/provider/VideoVib/watch/anilist:{id}/{ep}/{audio}`. */
export function buildKittyWatchPath(opts: {
  provider: string;
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  seriesRefPrefix?: "anilist" | "catalog";
}): string {
  const prefix = opts.seriesRefPrefix ?? "anilist";
  const seriesRef = `${prefix}:${opts.anilistId}`;
  return `/provider/${encodeURIComponent(opts.provider)}/watch/${encodeURIComponent(seriesRef)}/${encodeURIComponent(String(opts.episode))}/${opts.audio}`;
}

/** Provider-specific KittyAPI stream path (stream-direct vs watch). */
export function buildKittyProviderStreamPath(opts: {
  provider: string;
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  if (opts.provider === "VideoVib") {
    return buildKittyWatchPath({
      provider: opts.provider,
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
    });
  }

  return buildKittyStreamDirectPath(opts);
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
