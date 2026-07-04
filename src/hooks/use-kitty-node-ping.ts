"use client";

import { useEffect, useMemo, useState } from "react";
import type { KittyApiNodeId, KittyNodePingResult } from "@/lib/kitty/kitty-api-nodes";
import { measureAllKittyNodesFromClient } from "@/lib/kitty/kitty-node-ping-client";

const PING_CACHE_TTL_MS = 60_000;

let pingCache: { at: number; nodes: KittyNodePingResult[] } | null = null;
let pingInflight: Promise<KittyNodePingResult[]> | null = null;

async function fetchNodePings(): Promise<KittyNodePingResult[]> {
  if (pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS) {
    return pingCache.nodes;
  }

  if (!pingInflight) {
    pingInflight = measureAllKittyNodesFromClient()
      .then((nodes) => {
        pingCache = { at: Date.now(), nodes };
        return nodes;
      })
      .finally(() => {
        pingInflight = null;
      });
  }

  return pingInflight;
}

export function pickFastestKittyNode(nodes: KittyNodePingResult[]): KittyApiNodeId | null {
  const reachable = nodes.filter((n) => n.ok && n.pingMs != null);
  if (!reachable.length) return null;
  reachable.sort((a, b) => (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity));
  return reachable[0]!.id;
}

export function useKittyNodePing() {
  const [nodes, setNodes] = useState<KittyNodePingResult[]>(() => pingCache?.nodes ?? []);
  const [ready, setReady] = useState(() => Boolean(pingCache && Date.now() - pingCache.at < PING_CACHE_TTL_MS));
  const [loading, setLoading] = useState(!ready);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNodePings()
      .then((result) => {
        if (cancelled) return;
        setNodes(result);
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
  }, []);

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

  const fastestId = useMemo(() => pickFastestKittyNode(nodes), [nodes]);

  return { nodes, pingByNode, bandwidthByNode, fastestId, ready, loading };
}
