import { KITTY_API_NODES, type KittyNodePingResult } from "@/lib/kitty/kitty-api-nodes";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 20_000;

type BenchmarkNode = {
  origin?: string;
  online?: boolean;
  latencyMs?: number;
  bandwidthMbps?: number;
};

async function measureNodePing(nodeUrl: string): Promise<Omit<KittyNodePingResult, "id">> {
  const base = nodeUrl.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/proxy/benchmark?refresh=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { pingMs: null, bandwidthMbps: null, ok: false };
    }

    const data = (await res.json()) as { nodes?: BenchmarkNode[] };
    const entry = data.nodes?.find((node) => node.origin?.replace(/\/$/, "") === base);

    if (!entry?.online) {
      return { pingMs: null, bandwidthMbps: null, ok: false };
    }

    return {
      pingMs: entry.latencyMs ?? null,
      bandwidthMbps: entry.bandwidthMbps ?? null,
      ok: true,
    };
  } catch {
    return { pingMs: null, bandwidthMbps: null, ok: false };
  }
}

export async function GET() {
  const nodes: KittyNodePingResult[] = await Promise.all(
    KITTY_API_NODES.map(async (node) => ({
      id: node.id,
      ...(await measureNodePing(node.url)),
    })),
  );

  return Response.json({ nodes });
}
