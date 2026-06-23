import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ animeId: string; episodeId: string }> },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId, episodeId } = await params;
  const db = getDb();

  await db
    .delete(watchProgress)
    .where(
      and(
        eq(watchProgress.userId, payload.userId),
        eq(watchProgress.animeId, decodeURIComponent(animeId)),
        eq(watchProgress.episodeId, decodeURIComponent(episodeId)),
      ),
    );

  return NextResponse.json({ ok: true });
}
