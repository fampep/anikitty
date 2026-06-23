import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { animeId, episodeId, currentTime, duration, language, server, anilistId, animeTitle, animeThumbnail } = body;

    if (!animeId || !episodeId)
      return NextResponse.json({ error: "animeId and episodeId are required" }, { status: 400 });

    const db = getDb();

    await db
      .insert(watchProgress)
      .values({
        userId: payload.userId,
        animeId,
        episodeId,
        currentTime: Math.round(currentTime ?? 0),
        duration: Math.round(duration ?? 0),
        language: language ?? "sub",
        server: server ?? null,
        anilistId: anilistId ?? null,
        animeTitle: animeTitle ?? null,
        animeThumbnail: animeThumbnail ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [watchProgress.userId, watchProgress.animeId, watchProgress.episodeId],
        set: {
          currentTime: Math.round(currentTime ?? 0),
          duration: Math.round(duration ?? 0),
          language: language ?? "sub",
          server: server ?? null,
          ...(animeTitle ? { animeTitle } : {}),
          ...(animeThumbnail ? { animeThumbnail } : {}),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[progress POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
