import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq, countDistinct } from "drizzle-orm";
import { xpToLevel, getLevelProgress } from "@/lib/user-level";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  const [row] = await db
    .select({ count: countDistinct(watchProgress.episodeId) })
    .from(watchProgress)
    .where(eq(watchProgress.userId, payload.userId));

  const xp = Number(row?.count ?? 0);
  const info = getLevelProgress(xp);

  return NextResponse.json({
    xp,
    level: info.level,
    tier: info.tier,
    progressPct: info.progressPct,
  });
}
