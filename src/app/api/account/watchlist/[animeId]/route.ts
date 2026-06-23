import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ animeId: string }> },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId } = await params;
  const db = getDb();

  await db
    .delete(watchlist)
    .where(
      and(
        eq(watchlist.userId, payload.userId),
        eq(watchlist.animeId, decodeURIComponent(animeId)),
      ),
    );

  return NextResponse.json({ ok: true });
}
