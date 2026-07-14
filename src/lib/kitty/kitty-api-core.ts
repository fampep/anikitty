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

/**
 * True when a media URL is routed through the KittyAPI media proxy — either a
 * signed `/proxy?…` URL or an absolute URL on a KittyAPI cluster node. Raw
 * origin URLs (e.g. `https://hls.anidb.app/…`) return false: those bypass the
 * proxy (missing signed token + upstream Referer) and won't play.
 */
export function isKittyProxiedUrl(pathOrUrl: string): boolean {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return false;
  try {
    if (trimmed.includes("://")) {
      const parsed = new URL(trimmed);
      if (isKittyApiHost(parsed.hostname)) return true;
    }
  } catch {
    /* fall through to path check */
  }
  return isKittySignedProxyPath(trimmed);
}

import { parseKittyStreamQualities, type KittyStreamQuality } from "@/lib/kitty/stream-quality";

export type { KittyStreamQuality } from "@/lib/kitty/stream-quality";

export type KittyStreamPayload = {
  file: string;
  headers: Record<string, string>;
  download?: string | null;
  tracks?: Array<{ file?: string; url?: string; kind?: string; label?: string; default?: boolean }>;
  allServers?: KittyStreamQuality[];
  server?: string | null;
  /** Actual audio on the stream when KittyAPI reports it (may differ from the request). */
  audio?: "sub" | "dub";
  error?: string;
};

/** Reads `audio` / `servedAudio` from a KittyAPI stream JSON body. */
export function parseKittyStreamAudio(data: unknown): "sub" | "dub" | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as Record<string, unknown>;
  const raw = row.audio ?? row.servedAudio ?? row.streamAudio;
  return raw === "sub" || raw === "dub" ? raw : undefined;
}

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

function extractKittyStreamFile(row: Record<string, unknown>): string {
  for (const key of ["file", "url", "stream", "streamUrl", "hls", "m3u8"] as const) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const sources = row.sources;
  if (Array.isArray(sources)) {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      const entry = source as Record<string, unknown>;
      for (const key of ["file", "url", "stream"] as const) {
        const value = entry[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
    }
  }

  const nested = row.data;
  if (nested && typeof nested === "object") {
    return extractKittyStreamFile(nested as Record<string, unknown>);
  }

  return "";
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
  const file = extractKittyStreamFile(row);
  if (!file) return null;
  if (!ok && typeof row.error === "string" && row.error.trim()) return null;

  return {
    file,
    headers: (row.headers ?? {}) as Record<string, string>,
    download: typeof row.download === "string" ? row.download : null,
    tracks: Array.isArray(row.tracks) ? row.tracks : undefined,
    allServers: parseKittyStreamQualities(row.allServers),
    audio: parseKittyStreamAudio(row),
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
