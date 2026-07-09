import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { animeDetailCache } from "@/db/schema";

const FINISHED_TTL_MS = 24 * 60 * 60 * 1000;
const AIRING_TTL_MS = 2 * 60 * 60 * 1000;

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function cacheTtlMs(status: string | null | undefined): number {
  return status === "RELEASING" ? AIRING_TTL_MS : FINISHED_TTL_MS;
}

export function isDetailCacheStale(
  row: { fetchedAt: Date | null; status?: string | null },
): boolean {
  const fetchedAt = row.fetchedAt?.getTime() ?? 0;
  return Date.now() - fetchedAt > cacheTtlMs(row.status);
}

export async function getStoredAnimeDetail(
  anilistId: number,
): Promise<{ data: Record<string, unknown>; stale: boolean } | null> {
  if (!dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(animeDetailCache)
      .where(eq(animeDetailCache.anilistId, anilistId))
      .limit(1);

    if (!row?.detailJson) return null;

    const stale = isDetailCacheStale({ fetchedAt: row.fetchedAt, status: row.status });
    return { data: row.detailJson, stale };
  } catch (err) {
    console.error("[detail-cache] read failed:", err);
    return null;
  }
}

export async function storeAnimeDetail(
  anilistId: number,
  data: Record<string, unknown>,
  status?: string | null,
): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const now = new Date();

    await db
      .insert(animeDetailCache)
      .values({
        anilistId,
        status: status ?? null,
        detailJson: data,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: animeDetailCache.anilistId,
        set: {
          status: status ?? null,
          detailJson: data,
          fetchedAt: now,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[detail-cache] save failed:", err);
  }
}
