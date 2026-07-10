import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getPublicSkipDatabase } from "@/lib/skip/community-skip-server";

export async function GET() {
  const db = getDb();
  const data = await getPublicSkipDatabase(db);
  return NextResponse.json(data);
}
