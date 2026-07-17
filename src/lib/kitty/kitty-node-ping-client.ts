import {
  KITTY_API_NODES,
  type KittyApiNodeId,
  type KittyNodePingResult,
} from "@/lib/kitty/kitty-api-nodes";
import { buildKittySpeedtestPath } from "@/lib/kitty/kitty-api-core";

const SPEEDTEST_BYTES = 65_536;
const PING_TIMEOUT_MS = 5_000;

export async function measureKittyNodeFromClient(
  nodeUrl: string,
): Promise<Omit<KittyNodePingResult, "id">> {
  const base = nodeUrl.replace(/\/$/, "");
  const url = `${base}${buildKittySpeedtestPath(SPEEDTEST_BYTES)}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      cache: "no-store",
      mode: "cors",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { pingMs: null, bandwidthMbps: null, ok: false };
    }

    const pingMs = Date.now() - start;
    const buffer = await res.arrayBuffer();
    const totalMs = Date.now() - start;
    const bytes = buffer.byteLength;

    let bandwidthMbps: number | null = null;
    if (bytes > 0 && totalMs > pingMs) {
      bandwidthMbps = Math.round(((bytes * 8) / (totalMs / 1000) / 1_000_000) * 10) / 10;
    }

    return { pingMs, bandwidthMbps, ok: true };
  } catch {
    return { pingMs: null, bandwidthMbps: null, ok: false };
  }
}

export async function measureAllKittyNodesFromClient(): Promise<KittyNodePingResult[]> {
  return Promise.all(
    KITTY_API_NODES.map(async (node) => ({
      id: node.id,
      ...(await measureKittyNodeFromClient(node.url)),
    })),
  );
}
