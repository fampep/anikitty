import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchProgress } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { parseEpisodeNumber, updateAniListProgress } from "@/lib/anilist-sync";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { animeId, episodeId, currentTime, duration, language, server, anilistId, animeTitle, animeThumbnail, episodeNumber } = body;

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

    // Fire-and-forget AniList progress sync when the user has linked OAuth
    if (anilistId) {
      const roundedCurrent = Math.round(currentTime ?? 0);
      const roundedDuration = Math.round(duration ?? 0);
      const watchedEnough =
        roundedDuration > 0 && roundedCurrent / roundedDuration >= 0.9;

      if (watchedEnough) {
        const episodeNum =
          (typeof episodeNumber === "number" && episodeNumber > 0
            ? episodeNumber
            : parseEpisodeNumber(episodeId)) ?? null;
        if (episodeNum) {
          void (async () => {
            try {
              const db2 = getDb();
              const [user] = await db2
                .select({ anilistAccessToken: users.anilistAccessToken })
                .from(users)
                .where(eq(users.id, payload.userId))
                .limit(1);

              if (user?.anilistAccessToken) {
                await updateAniListProgress(
                  user.anilistAccessToken,
                  anilistId,
                  episodeNum,
                  "CURRENT",
                );
              }
            } catch (e) {
              console.error("[progress POST] AniList sync failed:", e);
            }
          })();
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[progress POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
