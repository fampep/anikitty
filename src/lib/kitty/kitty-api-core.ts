import {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNodeUrl,
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
} from "@/lib/kitty/kitty-api-nodes";

/** @deprecated Use getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID) */
export const DEFAULT_KITTY_API_BASE = getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID);

function normalizeBase(base: string): string {
  return base.replace(/\/$/, "");
}

export function getKittyApiBases(): string[] {
  const envBase = process.env.KITTY_API_BASE?.trim();
  if (envBase) return [normalizeBase(envBase)];
  return [getKittyApiNodeUrl("primary"), getKittyApiNodeUrl("fallback")];
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
};

/** Fetch KittyAPI on a single node (no automatic failover). */
export async function kittyApiFetch(
  path: string,
  init?: RequestInit,
  opts?: KittyApiFetchOptions,
): Promise<Response> {
  const nodeId = opts?.nodeId ?? DEFAULT_KITTY_API_NODE_ID;
  const base = getKittyApiBase(nodeId);
  return fetch(kittyApiPath(path, base), init);
}

function kittyAuthHeaders(apiKey: string | undefined): HeadersInit {
  const key = apiKey?.trim();
  if (!key) return {};
  return {
    Authorization: `Bearer ${key}`,
    "x-api-key": key,
  };
}

export function kittyStreamHeaders(): HeadersInit {
  return kittyAuthHeaders(process.env.KITTY_API_KEY);
}

export function kittyApiHeaders(): HeadersInit {
  return kittyAuthHeaders(process.env.KITTY_API_KEY);
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
