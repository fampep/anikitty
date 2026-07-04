import {
  DEFAULT_KITTY_API_NODE_ID,
  getKittyApiNodeUrl,
  KITTY_API_NODES,
  resolveKittyNodeIdFromOrigin,
  type KittyApiNodeId,
  type KittyNodePingResult,
} from "@/lib/kitty/kitty-api-nodes";
import {
  buildKittyBenchmarkPath,
  type KittyBenchmarkResponse,
} from "@/lib/kitty/kitty-api-core";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 20_000;

function matchBenchmarkEntry(nodeUrl: string, entryOrigin: string | undefined): boolean {
  if (!entryOrigin?.trim()) return false;
  return entryOrigin.trim().replace(/\/$/, "") === nodeUrl.replace(/\/$/, "");
}

async function fetchClusterBenchmark(): Promise<KittyBenchmarkResponse | null> {
  const base = getKittyApiNodeUrl(DEFAULT_KITTY_API_NODE_ID);
  try {
    const res = await fetch(`${base}${buildKittyBenchmarkPath(true)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as KittyBenchmarkResponse;
  } catch {
    return null;
  }
}

export async function GET() {
  const benchmark = await fetchClusterBenchmark();
  const recommended = resolveKittyNodeIdFromOrigin(benchmark?.recommended);

  const nodes: KittyNodePingResult[] = KITTY_API_NODES.map((node) => {
    const entry = benchmark?.nodes?.find((row) => matchBenchmarkEntry(node.url, row.origin));
    if (!entry) {
      return { id: node.id, pingMs: null, bandwidthMbps: null, ok: false };
    }
    return {
      id: node.id,
      pingMs: entry.latencyMs ?? null,
      bandwidthMbps: entry.bandwidthMbps ?? null,
      ok: Boolean(entry.online),
    };
  });

  return Response.json({ nodes, recommended });
}
