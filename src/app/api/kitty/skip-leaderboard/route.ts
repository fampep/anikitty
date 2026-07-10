import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSkipContributorLeaderboard } from "@/lib/skip/community-skip-server";

export async function GET(req: Request) {
  const limit = Math.min(
    25,
    Math.max(1, parseInt(new URL(req.url).searchParams.get("limit") ?? "10", 10) || 10),
  );
  const db = getDb();
  const contributors = await getSkipContributorLeaderboard(db, limit);
  return NextResponse.json({ contributors });
}
