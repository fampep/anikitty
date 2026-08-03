import "server-only";

import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import type { AudioAvailability } from "@/lib/providers/anikoto-availability";

export type ProviderAudioCounts = {
  sub: number;
  dub: number;
  source: string;
};

export type KittyAudioCounts = AudioAvailability & {
  anilistId: number;
  provider?: string;
  source?: string;
  /** Per-provider breakdown from KittyAPI. */
  breakdown?: Record<string, ProviderAudioCounts>;
  providers?: string[];
};

function toCounts(sub: number, dub: number): AudioAvailability {
  const safeSub = Math.max(0, Math.floor(sub) || 0);
  const safeDub = Math.max(0, Math.floor(dub) || 0);
  return {
    sub: safeSub,
    dub: safeDub,
    hasSub: safeSub > 0,
    hasDub: safeDub > 0,
  };
}

function parseKittyAudioBody(body: unknown, fallbackId?: number): KittyAudioCounts | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.error === "string" && row.error) return null;
  const anilistId =
    typeof row.anilistId === "number"
      ? row.anilistId
      : fallbackId != null && fallbackId > 0
        ? fallbackId
        : 0;
  if (anilistId <= 0) return null;

  // Extract breakdown from per-provider data if available.
  const breakdown: Record<string, ProviderAudioCounts> = {};
  let maxSub = 0;
  let maxDub = 0;

  if (row.breakdown && typeof row.breakdown === "object") {
    const bd = row.breakdown as Record<string, unknown>;
    for (const [provider, data] of Object.entries(bd)) {
      if (data && typeof data === "object") {
        const provData = data as Record<string, unknown>;
        const sub = typeof provData.sub === "number" ? provData.sub : Number(provData.sub) || 0;
        const dub = typeof provData.dub === "number" ? provData.dub : Number(provData.dub) || 0;
        if (sub > 0 || dub > 0) {
          breakdown[provider] = {
            sub: Math.max(0, Math.floor(sub) || 0),
            dub: Math.max(0, Math.floor(dub) || 0),
            source: typeof provData.source === "string" ? provData.source : provider,
          };
          maxSub = Math.max(maxSub, breakdown[provider].sub);
          maxDub = Math.max(maxDub, breakdown[provider].dub);
        }
      }
    }
  }

  // Fall back to top-level counts if no breakdown.
  let sub = maxSub || (typeof row.sub === "number" ? row.sub : Number(row.sub));
  let dub = maxDub || (typeof row.dub === "number" ? row.dub : Number(row.dub));

  if (!Number.isFinite(sub) && !Number.isFinite(dub)) return null;
  const counts = toCounts(sub || 0, dub || 0);
  if (!counts.hasSub && !counts.hasDub) return null;

  const providers = Array.isArray(row.providers)
    ? (row.providers as unknown[]).map(String).filter(Boolean)
    : Object.keys(breakdown);

  return {
    anilistId,
    ...counts,
    provider: typeof row.provider === "string" ? row.provider : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
    breakdown: Object.keys(breakdown).length > 0 ? breakdown : undefined,
    providers: providers.length > 0 ? providers : undefined,
  };
}

export function buildKittyAudioPath(opts: {
  anilistId: number;
  provider?: string;
  title?: string | null;
  refresh?: boolean;
}): string {
  const params = new URLSearchParams({ anilistId: String(opts.anilistId) });
  if (opts.provider?.trim()) params.set("provider", opts.provider.trim());
  if (opts.title?.trim()) params.set("title", opts.title.trim());
  if (opts.refresh) params.set("refresh", "1");
  return `/audio?${params.toString()}`;
}

export function buildKittyAudioBatchPath(ids: number[], refresh = false): string {
  const unique = [...new Set(ids.filter((id) => id > 0))].slice(0, 40);
  const params = new URLSearchParams({ ids: unique.join(",") });
  if (refresh) params.set("refresh", "1");
  return `/audio/batch?${params.toString()}`;
}

/** Single-title SUB/DUB episode totals from KittyAPI auto provider chain. */
export async function fetchKittyAudio(opts: {
  anilistId: number;
  provider?: string;
  title?: string | null;
  refresh?: boolean;
  timeoutMs?: number;
}): Promise<KittyAudioCounts | null> {
  if (opts.anilistId <= 0) return null;
  try {
    const res = await kittyApiFetch(buildKittyAudioPath(opts), {
      method: "GET",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return parseKittyAudioBody(body, opts.anilistId);
  } catch {
    return null;
  }
}

/** Batch SUB/DUB totals keyed by AniList id. */
export async function fetchKittyAudioBatch(
  ids: number[],
  opts?: { refresh?: boolean; timeoutMs?: number },
): Promise<Map<number, KittyAudioCounts>> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  const out = new Map<number, KittyAudioCounts>();
  if (unique.length === 0) return out;

  // KittyAPI batch caps at 40 — chunk if needed.
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    try {
      const res = await kittyApiFetch(buildKittyAudioBatchPath(chunk, opts?.refresh), {
        method: "GET",
        signal: AbortSignal.timeout(opts?.timeoutMs ?? 45_000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => null)) as {
        results?: Record<string, unknown>;
      } | null;
      const results = body?.results;
      if (!results || typeof results !== "object") continue;
      for (const [key, value] of Object.entries(results)) {
        const id = Number(key);
        const parsed = parseKittyAudioBody(value, id);
        if (parsed) out.set(parsed.anilistId, parsed);
      }
    } catch {
      // ignore chunk failures — caller keeps Anikoto / AniList fallbacks
    }
  }

  return out;
}
