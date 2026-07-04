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

export function useKittyNodePing() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [nodes, setNodes] = useState<KittyNodePingResult[]>(() => pingCache?.nodes ?? []);
  const [recommended, setRecommended] = useState<KittyApiNodeId | null>(
    () => pingCache?.recommended ?? null,
  );
  const [ready, setReady] = useState(() => Boolean(pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS));
  const [loading, setLoading] = useState(!ready);

  const refresh = useCallback(() => {
    invalidateKittyNodePingCache();
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNodePings()
      .then((result) => {
        if (cancelled) return;
        setNodes(result.nodes);
        setRecommended(result.recommended);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setReady(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
