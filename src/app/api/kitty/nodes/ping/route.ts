import { KITTY_API_NODES, type KittyApiNodeId, type KittyNodePingResult } from "@/lib/kitty/kitty-api-nodes";
import { kittyStreamHeaders } from "@/lib/kitty/kitty-api-server";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 5_000;

async function measureNodePing(nodeUrl: string): Promise<{ pingMs: number | null; ok: boolean }> {
  const start = Date.now();
  try {
    const res = await fetch(`${nodeUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      headers: kittyStreamHeaders(),
    });
    return { pingMs: Math.round(Date.now() - start), ok: res.ok };
  } catch {
    return { pingMs: null, ok: false };
  }
}

export async function GET() {
  const nodes: KittyNodePingResult[] = await Promise.all(
    KITTY_API_NODES.map(async (node) => {
      const result = await measureNodePing(node.url);
      return { id: node.id, ...result };
    }),
  );

  return Response.json({ nodes });
}
