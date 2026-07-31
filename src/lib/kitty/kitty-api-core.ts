import {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNodeUrl,
  isRemovedKittyApiHost,
  KITTY_API_NODE_DNS_SLUGS,
  KITTY_API_NODES,
  PUBLIC_KITTY_API_HOST,
  PUBLIC_KITTY_API_ORIGIN,
  PUBLIC_KITTY_DNS_ZONE,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";

export type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
export {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNode,
  getKittyApiNodeUrl,
  isKittyApiNodeId,
  isRemovedKittyApiHost,
  coerceKittyApiNodeId,
  KITTY_API_NODES,
  PUBLIC_KITTY_API_HOST,
  PUBLIC_KITTY_API_ORIGIN,
  PUBLIC_KITTY_DNS_ZONE,
  parseKittyNodeParam,
  resolveKittyNodeIdFromOrigin,
  isKittyNodeRaceParam,
  kittyNodeRaceOrder,
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
 * KittyAPI media proxy path (`/proxy?url=…&sig=…` or relative `/proxy?…`).
 * Browser clients never call this directly — AniKitty `/api/kitty/hls` does.
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

/**
 * True when `url` is an absolute KittyAPI cluster `/proxy` media URL.
 * Used so server-side HLS/subtitle fetches can attach `KITTY_API_KEY`.
 */
export function isKittyMediaProxyUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(trimmed, "https://kittyapi.local");
    if (trimmed.includes("://") && !isKittyApiHost(parsed.hostname)) return false;
    const pathOnly = parsed.pathname.replace(/\/+$/, "") || "/";
    return pathOnly === "/proxy";
  } catch {
    return false;
  }
}

/**
 * Merge KittyAPI auth into upstream headers when fetching a cluster `/proxy` URL.
 * Server-only — never mint these into browser-visible playback URLs.
 */
export function withKittyProxyAuthHeaders(
  targetUrl: string,
  headers: Record<string, string>,
): Record<string, string> {
  if (!isKittyMediaProxyUrl(targetUrl)) return headers;
  const auth = kittyAuthHeaders();
  const next = { ...headers };
  for (const [name, value] of Object.entries(auth)) {
    if (value && !next[name]) next[name] = value;
  }
  return next;
}

function isKittyNoApiKeyPath(path: string): boolean {
  // Benchmark/speedtest stay public. Media `/proxy` is signed *and* may carry
  // server-side X-API-Key from AniKitty HLS — still skip auto-auth here so
  // accidental browser/client fetches never attach the key via kittyApiFetch.
  return isKittyPublicPath(path) || isKittySignedProxyPath(path);
}

/**
 * True when a media URL is routed through the KittyAPI media proxy — either a
 * signed `/proxy?…` URL or an absolute URL on a KittyAPI cluster node. Raw
 * raw upstream HLS URLs return false: those bypass the
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
  /**
   * Seek-preview storyboard WebVTT URL (ReAnime/FlixCloud `thumbnails_vtt`,
   * or KittyAPI `thumbnails`).
   */
  thumbnails?: string | null;
  /** Actual audio on the stream when KittyAPI reports it (may differ from the request). */
  audio?: "sub" | "dub";
  /** True when KittyAPI returned a persistent stored stream URL. */
  cached?: boolean;
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

/** KittyAPI origin for a node (public location DNS). Defaults to Sweden. */
export function getKittyApiPublicBase(nodeId?: KittyApiNodeId): string {
  if (nodeId) return getKittyApiNodeUrl(nodeId);
  return getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID);
}

export function getKittyApiBases(): string[] {
  return KITTY_API_NODES.map((node) => getKittyApiPublicBase(node.id));
}

/** @deprecated Prefer getKittyApiPublicBase for browser-facing URLs. */
export function getKittyApiBase(nodeId?: KittyApiNodeId): string {
  return getKittyApiPublicBase(nodeId);
}

/** True when the host belongs to a configured KittyAPI cluster node (public DNS only). */
export function isKittyApiHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === PUBLIC_KITTY_API_HOST) return true;
  if (/^vps-[a-z0-9-]+\.anikitty\.online$/i.test(lower)) return true;
  if (/\.vps\.anikitty\.online$/i.test(lower)) return true;
  // Location DNS: sweden.anikitty.online, etc. — not the marketing site.
  if (KITTY_API_NODES.some((node) => node.host.toLowerCase() === lower)) return true;
  for (const slug of Object.values(KITTY_API_NODE_DNS_SLUGS)) {
    if (lower === `${slug}.${PUBLIC_KITTY_DNS_ZONE}`) return true;
  }
  // Legacy sslip hostnames — rewrite onto the active node's public DNS.
  if (/^kittyapi\.[\d-]+\.sslip\.io$/i.test(lower)) return true;
  return false;
}

function isBareIpv4Hostname(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

/**
 * Pin KittyAPI absolute URLs to the selected node's public location DNS
 * (never leave bare origin IPs in browser-facing URLs).
 */
export function normalizeKittyApiUrl(url: string, nodeId?: KittyApiNodeId): string {
  const kittyBase = getKittyApiBase(nodeId);

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Always rewrite bare IPv4 proxy origins onto public HTTPS DNS (mixed-content fix).
    const rewrite =
      isKittyApiHost(host) || isBareIpv4Hostname(host);
    if (!rewrite) return url;

    const baseUrl = new URL(kittyBase);
    parsed.protocol = baseUrl.protocol;
    parsed.host = baseUrl.host;
    return parsed.toString();
  } catch {
    return url;
  }
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
  /**
   * When true (default), retry on another cluster node if the preferred node is
   * unreachable (network / 5xx). Does not failover on 4xx application errors.
   */
  failover?: boolean;
  /** Server-only: pin fetches to a per-node origin (e.g. http://IP). */
  resolveBase?: (nodeId: KittyApiNodeId) => string;
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

function isTransientKittyFailure(res: Response | null, err: unknown): boolean {
  if (err) return true;
  if (!res) return true;
  // Infra/gateway failures only — provider 500s should not fan out across the cluster.
  return res.status === 502 || res.status === 503 || res.status === 504 || res.status === 408 || res.status === 429;
}

function kittyFailoverOrder(preferred: KittyApiNodeId): KittyApiNodeId[] {
  const rest = KITTY_API_NODES.map((n) => n.id).filter((id) => id !== preferred);
  return [preferred, ...rest];
}

/** Per-node budget so a hung peer cannot consume the caller's entire AbortSignal.
 * AniWaves/MegaPlay stream-direct often needs 8–14s; keep headroom under that. */
const KITTY_FETCH_ATTEMPT_TIMEOUT_MS = 14_000;

function attemptSignal(parent: AbortSignal | null | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(KITTY_FETCH_ATTEMPT_TIMEOUT_MS);
  if (!parent) return timeout;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([parent, timeout]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent.aborted || timeout.aborted) {
    abort();
    return controller.signal;
  }
  parent.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

/** Fetch KittyAPI — optionally failover across cluster nodes on transport/5xx errors. */
export async function kittyApiFetch(
  path: string,
  init?: RequestInit,
  opts?: KittyApiFetchOptions,
): Promise<Response> {
  const preferred = opts?.nodeId ?? DEFAULT_KITTY_API_NODE_ID;
  const failover = opts?.failover !== false;
  const order = failover ? kittyFailoverOrder(preferred) : [preferred];
  const merged = mergeKittyFetchInit(path, init, opts?.skipAuth);
  const parentSignal = init?.signal ?? undefined;

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (const nodeId of order) {
    if (parentSignal?.aborted) {
      throw parentSignal.reason instanceof Error
        ? parentSignal.reason
        : new Error("KittyAPI request aborted");
    }

    const base = normalizeBase(
      opts?.resolveBase?.(nodeId) ?? getKittyApiPublicBase(nodeId),
    );
    if (isRemovedKittyApiHost(base)) continue;

    try {
      const res = await fetch(kittyApiPath(path, base), {
        ...merged,
        signal: attemptSignal(parentSignal),
      });
      if (!failover || !isTransientKittyFailure(res, null)) {
        return res;
      }
      lastResponse = res;
    } catch (err) {
      lastError = err;
      if (!failover) throw err;
      // Parent deadline — stop failover immediately.
      if (parentSignal?.aborted) throw err;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError instanceof Error ? lastError : new Error("KittyAPI unreachable on all nodes");
}

/** API key headers for KittyAPI JSON routes (search, stream-direct, etc.).
 * Media `/proxy` playback goes through AniKitty `/api/kitty/hls`, which attaches
 * {@link withKittyProxyAuthHeaders} server-side — never put the key in browser URLs. */
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
  /** Bust persistent stream_links row and re-resolve. */
  refresh?: boolean;
  /** Provider-specific backend hint (e.g. HentaiHaven `title:…`, AniKuro `animepower`). */
  backend?: string | null;
}): string {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });

  const title = opts.title?.trim();
  if (title) params.set("title", title);
  if (opts.refresh) params.set("refresh", "1");

  const backend =
    opts.backend?.trim() ||
    (opts.provider === "HentaiHaven" && title ? `title:${title}` : "");
  if (backend) params.set("backend", backend);

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

  const thumbnailsRaw =
    (typeof row.thumbnails === "string" && row.thumbnails.trim()) ||
    (typeof row.thumbnails_vtt === "string" && row.thumbnails_vtt.trim()) ||
    null;

  return {
    file,
    headers: (row.headers ?? {}) as Record<string, string>,
    download: typeof row.download === "string" ? row.download : null,
    tracks: Array.isArray(row.tracks) ? row.tracks : undefined,
    allServers: parseKittyStreamQualities(row.allServers),
    thumbnails: thumbnailsRaw,
    audio: parseKittyStreamAudio(row),
    cached: row.cached === true || row.cached === "true",
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
  nodeId?: string | null;
  online?: boolean;
  latencyMs?: number;
  bandwidthMbps?: number;
  speedtestUrl?: string;
};

export type KittyBenchmarkResponse = {
  recommended?: string;
  recommendedNodeId?: string | null;
  nodes?: KittyBenchmarkNode[];
};

export function buildKittyBenchmarkPath(refresh = true): string {
  return refresh ? "/proxy/benchmark?refresh=1" : "/proxy/benchmark";
}

export function buildKittySpeedtestPath(bytes = 65_536): string {
  return `/proxy/speedtest?bytes=${bytes}`;
}
