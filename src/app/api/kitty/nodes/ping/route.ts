import {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNodeUrl,
  KITTY_API_NODES,
  resolveKittyNodeIdFromOrigin,
  type KittyApiNodeMeta,
  type KittyApiNodeId,
  type KittyNodePingResult,
} from "@/lib/kitty/kitty-api-nodes";
import {
  getKittyApiNodeDirectUrl,
  resolveKittyNodeIdFromOriginIp,
} from "@/lib/kitty/kitty-api-node-origins.server";
import {
  buildKittyBenchmarkPath,
  buildKittyHealthPath,
  kittyAuthHeaders,
  type KittyBenchmarkResponse,
} from "@/lib/kitty/kitty-api-core";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 8_000;
const PROBE_TIMEOUT_MS = 4_000;

/** Prefer the default node, then walk the cluster if that origin is down. */
async function fetchClusterBenchmark(): Promise<KittyBenchmarkResponse | null> {
  const order = [
    DEFAULT_KITTY_API_NODE_ID,
    ...KITTY_API_NODES.map((n) => n.id).filter((id) => id !== DEFAULT_KITTY_API_NODE_ID),
  ];

  for (const nodeId of order) {
    // Direct origin first so status stays accurate if Cloudflare is degraded.
    const bases = [getKittyApiNodeDirectUrl(nodeId), getKittyApiNodeUrl(nodeId)];
    for (const base of bases) {
      try {
        const res = await fetch(`${base}${buildKittyBenchmarkPath(true)}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        });
        if (!res.ok) continue;
        return (await res.json()) as KittyBenchmarkResponse;
      } catch {
        /* try next base / node */
      }
    }
  }
  return null;
}

function matchBenchmarkEntry(
  node: KittyApiNodeMeta,
  row: { origin?: string; nodeId?: string | null },
): boolean {
  if (row.nodeId) {
    const mapped = resolveKittyNodeIdFromOrigin(row.nodeId);
    if (mapped === node.id) return true;
  }
  if (!row.origin?.trim()) return false;
  const byId = resolveKittyNodeIdFromOrigin(row.origin);
  if (byId === node.id) return true;
  const byIp = resolveKittyNodeIdFromOriginIp(row.origin);
  return byIp === node.id;
}

/**
 * Probe a node on its direct origin so per-VPS health stays meaningful with a
 * shared public hostname.
 */
async function probeNode(node: KittyApiNodeMeta): Promise<{ ok: boolean; pingMs: number | null }> {
  const started = Date.now();
  try {
    const res = await fetch(`${getKittyApiNodeDirectUrl(node.id)}${buildKittyHealthPath()}`, {
      cache: "no-store",
      headers: kittyAuthHeaders(),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok && res.status !== 401) return { ok: false, pingMs: null };
    return { ok: true, pingMs: Date.now() - started };
  } catch {
    return { ok: false, pingMs: null };
  }
}

export async function GET() {
  const benchmark = await fetchClusterBenchmark();
  const recommended =
    resolveKittyNodeIdFromOrigin(benchmark?.recommendedNodeId) ??
    resolveKittyNodeIdFromOriginIp(benchmark?.recommended) ??
    resolveKittyNodeIdFromOrigin(benchmark?.recommended);

  const nodes: KittyNodePingResult[] = await Promise.all(
    KITTY_API_NODES.map(async (node): Promise<KittyNodePingResult> => {
      const entry = benchmark?.nodes?.find((row) => matchBenchmarkEntry(node, row));

      if (entry?.online) {
        return {
          id: node.id,
          pingMs: entry.latencyMs ?? null,
          bandwidthMbps: entry.bandwidthMbps ?? null,
          ok: true,
        };
      }

      const probe = await probeNode(node);
      return {
        id: node.id,
        pingMs: probe.pingMs ?? entry?.latencyMs ?? null,
        bandwidthMbps: entry?.bandwidthMbps ?? null,
        ok: probe.ok,
      };
    }),
  );

  const recommendedOnline =
    recommended && nodes.some((n) => n.id === recommended && n.ok) ? recommended : null;
  const fastestOnline =
    nodes
      .filter((n) => n.ok && n.pingMs != null)
      .sort((a, b) => (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity))[0]?.id ?? null;

  return Response.json({
    nodes,
    recommended: recommendedOnline ?? fastestOnline,
  });
}

export const maxDuration = 30;
