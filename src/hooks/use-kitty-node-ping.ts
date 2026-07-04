"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { KittyApiNodeId, KittyNodePingResult } from "@/lib/kitty/kitty-api-nodes";
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

async function fetchNodePings(): Promise<PingCache> {
  if (pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS) {
    return pingCache;
  }

  if (!pingInflight) {
    pingInflight = Promise.all([
      measureAllKittyNodesFromClient(),
      fetchServerBenchmark(),
    ])
      .then(([clientNodes, serverBenchmark]) => {
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
      .finally(() => {
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
  return recommended ?? null;
}

type UseKittyNodePingOptions = {
  enabled?: boolean;
};

export function useKittyNodePing(options?: UseKittyNodePingOptions) {
  const enabled = options?.enabled ?? true;
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
      fetchNodePings()
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
  }, [enabled, refreshKey, syncFromCache]);

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
