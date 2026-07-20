import "server-only";

import {
  KITTY_API_NODES,
  kittyNodeRaceOrder,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";
import { getKittyApiNodeDirectUrl } from "@/lib/kitty/kitty-api-node-origins.server";
import {
  buildKittyHealthPath,
  kittyAuthHeaders,
} from "@/lib/kitty/kitty-api-core";
import type { KittyStreamPayload } from "@/lib/kitty/kitty-api-core";

/** Skip nodes that recently failed health / race for this long. */
export const KITTY_NODE_DEAD_COOLDOWN_MS = 45_000;

/** Parallel /health budget before stream-direct race. */
export const KITTY_HEALTH_PREFILTER_MS = 1_200;

/** Delay between launching each additional racer (avoids thundering herd). */
export const KITTY_RACE_STAGGER_MS = 75;

/** Per-node stream-direct budget during a race. */
export const KITTY_RACE_ATTEMPT_TIMEOUT_MS = 14_000;

const deadUntil = new Map<KittyApiNodeId, number>();

type ProviderNodeStat = {
  score: number;
  updatedAt: number;
};

/** provider → node → decaying win score (in-memory, per process). */
const providerNodeScores = new Map<string, Map<KittyApiNodeId, ProviderNodeStat>>();

const SCORE_HALF_LIFE_MS = 30 * 60_000; // 30m
const WIN_BOOST = 1;
const FAIL_PENALTY = 0.35;

function decayFactor(ageMs: number): number {
  if (ageMs <= 0) return 1;
  return Math.pow(0.5, ageMs / SCORE_HALF_LIFE_MS);
}

function normalizeProviderKey(provider: string | null | undefined): string {
  return (provider ?? "").trim().toLowerCase() || "_unknown";
}

export function markKittyNodeDead(
  nodeId: KittyApiNodeId,
  cooldownMs = KITTY_NODE_DEAD_COOLDOWN_MS,
): void {
  deadUntil.set(nodeId, Date.now() + cooldownMs);
}

export function clearKittyNodeDead(nodeId: KittyApiNodeId): void {
  deadUntil.delete(nodeId);
}

export function isKittyNodeCoolingDown(nodeId: KittyApiNodeId, now = Date.now()): boolean {
  const until = deadUntil.get(nodeId);
  if (until == null) return false;
  if (until <= now) {
    deadUntil.delete(nodeId);
    return false;
  }
  return true;
}

function getProviderStats(provider: string): Map<KittyApiNodeId, ProviderNodeStat> {
  const key = normalizeProviderKey(provider);
  let map = providerNodeScores.get(key);
  if (!map) {
    map = new Map();
    providerNodeScores.set(key, map);
  }
  return map;
}

function currentScore(stat: ProviderNodeStat | undefined, now: number): number {
  if (!stat) return 0;
  return stat.score * decayFactor(now - stat.updatedAt);
}

/** Record a successful race win for provider→node affinity. */
export function recordKittyProviderNodeWin(
  provider: string | null | undefined,
  nodeId: KittyApiNodeId,
): void {
  const now = Date.now();
  const map = getProviderStats(provider ?? "");
  const prev = currentScore(map.get(nodeId), now);
  map.set(nodeId, { score: prev + WIN_BOOST, updatedAt: now });
  clearKittyNodeDead(nodeId);
}

/** Soft-penalize a node that returned empty / errored for this provider. */
export function recordKittyProviderNodeFail(
  provider: string | null | undefined,
  nodeId: KittyApiNodeId,
): void {
  const now = Date.now();
  const map = getProviderStats(provider ?? "");
  const prev = currentScore(map.get(nodeId), now);
  map.set(nodeId, { score: Math.max(0, prev - FAIL_PENALTY), updatedAt: now });
}

/**
 * True when a stream-direct payload is a real playback win (not empty / error body).
 */
export function isValidKittyStreamWin(stream: KittyStreamPayload | null | undefined): boolean {
  if (!stream) return false;
  const file = stream.file?.trim() ?? "";
  if (file.length < 8) return false;
  // Error-only payloads occasionally include a placeholder file string.
  if (stream.error?.trim() && !file.includes("/proxy") && !/^https?:\/\//i.test(file)) {
    return false;
  }
  if (file.startsWith("/") || /^https?:\/\//i.test(file)) return true;
  return false;
}

/**
 * Quick parallel /health probes. Returns reachable candidates; if every probe
 * fails or times out, returns the original list so we still attempt stream-direct.
 */
export async function prefilterHealthyKittyNodes(
  candidates: readonly KittyApiNodeId[],
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<KittyApiNodeId[]> {
  if (candidates.length <= 1) return [...candidates];

  const timeoutMs = opts?.timeoutMs ?? KITTY_HEALTH_PREFILTER_MS;
  const path = buildKittyHealthPath();
  const auth = kittyAuthHeaders();

  const results = await Promise.all(
    candidates.map(async (nodeId) => {
      if (opts?.signal?.aborted) return { nodeId, ok: false as const };
      const base = getKittyApiNodeDirectUrl(nodeId);
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const signal =
          opts?.signal && typeof AbortSignal.any === "function"
            ? AbortSignal.any([opts.signal, timeout])
            : timeout;
        const res = await fetch(`${base}${path}`, {
          cache: "no-store",
          headers: auth,
          signal,
        });
        // Auth-gated health returns 401 when the origin is up without a key.
        const ok = res.ok || res.status === 401;
        if (!ok) markKittyNodeDead(nodeId, Math.min(KITTY_NODE_DEAD_COOLDOWN_MS, 20_000));
        else clearKittyNodeDead(nodeId);
        return { nodeId, ok };
      } catch {
        markKittyNodeDead(nodeId, Math.min(KITTY_NODE_DEAD_COOLDOWN_MS, 20_000));
        return { nodeId, ok: false as const };
      }
    }),
  );

  const healthy = results.filter((r) => r.ok).map((r) => r.nodeId);
  return healthy.length > 0 ? healthy : [...candidates];
}

/**
 * Build race order: skip cooldown nodes, prefer historically good nodes for
 * this provider, then static cluster order. Never empty if any candidate remains.
 */
export function orderKittyNodesForRace(
  candidates: readonly KittyApiNodeId[],
  provider?: string | null,
  exclude: ReadonlySet<KittyApiNodeId> | readonly KittyApiNodeId[] = [],
): KittyApiNodeId[] {
  const skip = exclude instanceof Set ? exclude : new Set(exclude);
  const now = Date.now();
  const base = (candidates.length ? [...candidates] : kittyNodeRaceOrder()).filter(
    (id) => !skip.has(id),
  );

  const available = base.filter((id) => !isKittyNodeCoolingDown(id, now));
  const pool = available.length > 0 ? available : base;
  if (pool.length <= 1) return pool;

  const stats = getProviderStats(provider ?? "");
  const scored = pool.map((id, index) => ({
    id,
    score: currentScore(stats.get(id), now),
    // Stable tie-break: configured cluster index.
    index: KITTY_API_NODES.findIndex((n) => n.id === id) ?? index,
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((row) => row.id);
}
