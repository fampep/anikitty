import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ animeId: string; episodeId: string }> },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId, episodeId } = await params;
  const db = getDb();

  const [row] = await db
    .select()
    .from(watchProgress)
    .where(
      and(
        eq(watchProgress.userId, payload.userId),
        eq(watchProgress.animeId, decodeURIComponent(animeId)),
        eq(watchProgress.episodeId, decodeURIComponent(episodeId)),
      ),
    )
    .limit(1);

  if (!row) return NextResponse.json({ currentTime: 0, duration: 0 });

  return NextResponse.json({
    currentTime: row.currentTime ?? 0,
    duration: row.duration ?? 0,
    episodeId: row.episodeId,
  });
}

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
