import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getAudioCacheStats, resetAudioCache } from "@/lib/watch/anime-audio-store";
import { clearAudioMemoryCache } from "@/lib/providers/anikoto-availability";
import { clearAudioCountCache } from "@/lib/kitty/stream-capabilities";

export const dynamic = "force-dynamic";

/** Row count + freshness of the cached SUB/DUB totals. */
export async function GET(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stats = await getAudioCacheStats();
  if (!stats) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  return NextResponse.json(stats);
}

/**
 * Reset the sub/dub count cache.
 * `purge` (default) deletes every row — counts refetch on next request.
 * `stale` backdates them — old numbers show once more while refresh runs.
 *
 * Only clears the in-process caches of the node that serves this request;
 * other instances age out on their own TTL (10 min per-provider, 1–24h series).
 */
export async function POST(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  const mode = body.mode === "stale" ? "stale" : "purge";

  try {
    const result = await resetAudioCache(mode);
    if (!result) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const memoryCleared = clearAudioMemoryCache() + clearAudioCountCache();
    return NextResponse.json({ ok: true, mode, rows: result.rows, memoryCleared });
  } catch (e) {
    console.error("[admin/audio-cache] reset failed:", e);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
