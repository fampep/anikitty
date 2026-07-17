"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { KittyApiNodeId, KittyNodePingResult } from "@/lib/kitty/kitty-api-nodes";
import { KITTY_API_NODES } from "@/lib/kitty/kitty-api-nodes";
import { measureAllKittyNodesFromClient } from "@/lib/kitty/kitty-node-ping-client";

const PING_CACHE_TTL_MS = 60_000;

type PingCache = {
  at: number;
  nodes: KittyNodePingResult[];
  recommended: KittyApiNodeId | null;
};

let pingCache: PingCache | null = null;
let pingInflight: Promise<PingCache> | null = null;
const pingListeners = new Set<() => void>();

function emitPingUpdate() {
  pingListeners.forEach((listener) => listener());
}

async function fetchServerBenchmark(): Promise<{
  nodes: KittyNodePingResult[];
  recommended: KittyApiNodeId | null;
} | null> {
  try {
    const res = await fetch("/api/kitty/nodes/ping", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      nodes?: KittyNodePingResult[];
      recommended?: KittyApiNodeId | null;
    };
    return {
      nodes: data.nodes ?? [],
      recommended: data.recommended ?? null,
    };
  } catch {
    return null;
  }
}

type UseKittyNodePingOptions = {
  enabled?: boolean;
  /** Server benchmark only — skips heavy client speedtest downloads (~200KB). */
  lightweight?: boolean;
};

async function fetchNodePings(lightweight = false): Promise<PingCache> {
  if (pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS) {
    return pingCache;
  }

  if (!pingInflight) {
    pingInflight = (lightweight
      ? fetchServerBenchmark().then((serverBenchmark) => {
          const nodes = serverBenchmark?.nodes?.length ? serverBenchmark.nodes : [];
          const result: PingCache = {
            at: Date.now(),
            nodes,
            recommended: serverBenchmark?.recommended ?? null,
          };
          pingCache = result;
          emitPingUpdate();
          return result;
        })
      : Promise.all([
          measureAllKittyNodesFromClient(),
          fetchServerBenchmark(),
        ]).then(([clientNodes, serverBenchmark]) => {
          const clientReachable = clientNodes.some((n) => n.ok);
          const nodes = clientReachable
            ? clientNodes
            : serverBenchmark?.nodes?.length
              ? serverBenchmark.nodes
              : clientNodes;
          const result: PingCache = {
            at: Date.now(),
            nodes,
            recommended: serverBenchmark?.recommended ?? null,
          };
          pingCache = result;
          emitPingUpdate();
          return result;
        })
    ).finally(() => {
      pingInflight = null;
    });
  }

  return pingInflight;
}

export function invalidateKittyNodePingCache(): void {
  pingCache = null;
  pingInflight = null;
}

export function pickFastestKittyNode(
  nodes: KittyNodePingResult[],
  recommended?: KittyApiNodeId | null,
): KittyApiNodeId | null {
  const reachable = nodes.filter((n) => n.ok && n.pingMs != null);
  if (reachable.length) {
    reachable.sort((a, b) => (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity));
    return reachable[0]!.id;
  }
  // Recommended only if that node is still marked reachable (ok without ping).
  if (recommended && nodes.some((n) => n.id === recommended && n.ok)) {
    return recommended;
  }
  const anyOnline = nodes.find((n) => n.ok);
  return anyOnline?.id ?? null;
}

/** True when ping data says this node is unreachable (skip for streaming). */
export function isKittyNodeDead(
  nodes: KittyNodePingResult[],
  nodeId: KittyApiNodeId,
): boolean {
  if (!nodes.length) return false;
  const row = nodes.find((n) => n.id === nodeId);
  return row != null && !row.ok;
}

/** Healthy nodes sorted by lowest ping (CDN failover order). */
export function orderedHealthyKittyNodes(
  nodes: KittyNodePingResult[],
  preferred?: KittyApiNodeId | null,
): KittyApiNodeId[] {
  const healthy = nodes.filter((n) => n.ok);
  healthy.sort((a, b) => {
    if (preferred) {
      if (a.id === preferred) return -1;
      if (b.id === preferred) return 1;
    }
    return (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity);
  });
  return healthy.map((n) => n.id);
}

/** Next healthy node after `current`, skipping already-tried ids. */
export function pickNextKittyFailoverNode(
  nodes: KittyNodePingResult[],
  current: KittyApiNodeId,
  tried: ReadonlySet<KittyApiNodeId>,
): KittyApiNodeId | null {
  // Without ping data, still walk the static cluster so a hung preferred node
  // can fail over instead of stalling the player forever.
  const order = nodes.length
    ? orderedHealthyKittyNodes(nodes, current)
    : KITTY_API_NODES.map((n) => n.id);
  for (const id of order) {
    if (id === current) continue;
    if (tried.has(id)) continue;
    return id;
  }
  return null;
}

export function useKittyNodePing(options?: UseKittyNodePingOptions) {
  const enabled = options?.enabled ?? true;
  const lightweight = options?.lightweight ?? false;
  const [refreshKey, setRefreshKey] = useState(0);
  const [nodes, setNodes] = useState<KittyNodePingResult[]>(() => pingCache?.nodes ?? []);
  const [recommended, setRecommended] = useState<KittyApiNodeId | null>(
    () => pingCache?.recommended ?? null,
  );
  const [ready, setReady] = useState(
    () => Boolean(pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS),
  );
  const [loading, setLoading] = useState(() => enabled && !ready);

  const syncFromCache = useCallback(() => {
    if (!pingCache) return;
    setNodes(pingCache.nodes);
    setRecommended(pingCache.recommended);
    setReady(true);
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    invalidateKittyNodePingCache();
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const onUpdate = () => {
      if (!cancelled) syncFromCache();
    };

    pingListeners.add(onUpdate);

    const cacheFresh = Boolean(pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS);
    if (cacheFresh) {
      syncFromCache();
    } else {
      setLoading(true);
      fetchNodePings(lightweight)
        .then(() => {
          if (!cancelled) syncFromCache();
        })
        .catch(() => {
          if (!cancelled) {
            setReady(true);
            setLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
      pingListeners.delete(onUpdate);
    };
  }, [enabled, lightweight, refreshKey, syncFromCache]);

  const pingByNode = useMemo(() => {
    const map: Partial<Record<KittyApiNodeId, number | null>> = {};
    for (const row of nodes) {
      map[row.id] = row.pingMs;
    }
    return map;
  }, [nodes]);

  const bandwidthByNode = useMemo(() => {
    const map: Partial<Record<KittyApiNodeId, number | null>> = {};
    for (const row of nodes) {
      map[row.id] = row.bandwidthMbps;
    }
    return map;
  }, [nodes]);

  const fastestId = useMemo(
    () => pickFastestKittyNode(nodes, recommended),
    [nodes, recommended],
  );

  return { nodes, pingByNode, bandwidthByNode, fastestId, recommended, ready, loading, refresh };
}
