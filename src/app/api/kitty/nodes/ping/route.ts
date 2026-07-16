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
  buildKittyBenchmarkPath,
  buildKittyHealthPath,
  kittyAuthHeaders,
  type KittyBenchmarkResponse,
} from "@/lib/kitty/kitty-api-core";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 20_000;
const PROBE_TIMEOUT_MS = 6_000;

/** Compare origins ignoring protocol, case and trailing slashes. */
function normalizeOrigin(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function matchBenchmarkEntry(nodeUrl: string, entryOrigin: string | undefined): boolean {
  if (!entryOrigin?.trim()) return false;
  return normalizeOrigin(entryOrigin) === normalizeOrigin(nodeUrl);
}

/** Prefer the default node, then walk the cluster if that origin is down. */
async function fetchClusterBenchmark(): Promise<KittyBenchmarkResponse | null> {
  const order = [
    DEFAULT_KITTY_API_NODE_ID,
    ...KITTY_API_NODES.map((n) => n.id).filter((id) => id !== DEFAULT_KITTY_API_NODE_ID),
  ];

  for (const nodeId of order) {
    const base = getKittyApiNodeUrl(nodeId);
    try {
      const res = await fetch(`${base}${buildKittyBenchmarkPath(true)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      return (await res.json()) as KittyBenchmarkResponse;
    } catch {
      /* try next node */
    }
  }
  return null;
}

/**
 * Probe a node directly. Used when the cluster benchmark has no row for it (a
 * stale peer list, or an origin string that doesn't match our configured URL) —
 * otherwise a perfectly healthy node would be reported as unreachable.
 */
async function probeNode(node: KittyApiNodeMeta): Promise<{ ok: boolean; pingMs: number | null }> {
  const started = Date.now();
  try {
    const res = await fetch(`${node.url}${buildKittyHealthPath()}`, {
      cache: "no-store",
      headers: kittyAuthHeaders(),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, pingMs: null };
    return { ok: true, pingMs: Date.now() - started };
  } catch {
    return { ok: false, pingMs: null };
  }
}

export async function GET() {
  const benchmark = await fetchClusterBenchmark();
  const recommended = resolveKittyNodeIdFromOrigin(benchmark?.recommended);

  const nodes: KittyNodePingResult[] = await Promise.all(
    KITTY_API_NODES.map(async (node): Promise<KittyNodePingResult> => {
      const entry = benchmark?.nodes?.find((row) => matchBenchmarkEntry(node.url, row.origin));

      if (entry?.online) {
        return {
          id: node.id,
          pingMs: entry.latencyMs ?? null,
          bandwidthMbps: entry.bandwidthMbps ?? null,
          ok: true,
        };
      }

      // Missing row or reported offline — confirm with a direct health probe
      // before declaring the node down.
      const probe = await probeNode(node);
      return {
        id: node.id,
        pingMs: probe.pingMs ?? entry?.latencyMs ?? null,
        bandwidthMbps: entry?.bandwidthMbps ?? null,
        ok: probe.ok,
      };
    }),
  );

  // Prefer a recommended origin that is actually online in our probe results.
  const recommendedOnline =
    recommended && nodes.some((n) => n.id === recommended && n.ok) ? recommended : null;
  const fastestOnline = nodes
    .filter((n) => n.ok && n.pingMs != null)
    .sort((a, b) => (a.pingMs ?? Infinity) - (b.pingMs ?? Infinity))[0]?.id ?? null;

  return Response.json({
    nodes,
    recommended: recommendedOnline ?? fastestOnline,
  });
}

export const maxDuration = 30;
