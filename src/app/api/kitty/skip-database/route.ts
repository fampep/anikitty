import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getPublicSkipDatabase } from "@/lib/skip/community-skip-server";
import { enrichSkipDatabasePayload } from "@/lib/skip/skip-database-enrich";

export async function GET() {
  const db = getDb();
  const data = await getPublicSkipDatabase(db);
  const enriched = await enrichSkipDatabasePayload(data);
  return NextResponse.json(enriched, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
