import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getDb } from "@/db";
import { getPublicSkipDatabase } from "@/lib/skip/community-skip-server";
import { enrichSkipDatabasePayload } from "@/lib/skip/skip-database-enrich";

const getCachedSkipDatabase = unstable_cache(
  async () => {
    const db = getDb();
    const data = await getPublicSkipDatabase(db);
    return enrichSkipDatabasePayload(data);
  },
  ["skip-database-public-v2"],
  { revalidate: 120 },
);

export async function GET() {
  const enriched = await getCachedSkipDatabase();
  return NextResponse.json(enriched, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
