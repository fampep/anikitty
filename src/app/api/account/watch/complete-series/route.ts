import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchlist } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { updateAniListProgress } from "@/lib/oauth/anilist-sync";
import { eq, ne } from "drizzle-orm";

/**
 * Mark a whole series as watched: move it into the Completed list and, if the
 * user has AniList linked, set the AniList entry to COMPLETED. Mirrors the
 * auto-complete that fires when the last episode is finished.
 */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { animeId, anilistId, animeTitle, animeThumbnail, totalEpisodes } = body;

    if (!animeId) {
      return NextResponse.json({ error: "animeId is required" }, { status: 400 });
    }

    const db = getDb();
    const numericAnilistId =
      typeof anilistId === "number" && anilistId > 0 ? anilistId : null;
    const totalEps =
      typeof totalEpisodes === "number" && totalEpisodes > 0 ? totalEpisodes : 0;

    await db
      .insert(watchlist)
      .values({
        userId: payload.userId,
        animeId,
        folder: "COMPLETED",
        anilistId: numericAnilistId,
        animeTitle: animeTitle ?? null,
        animeThumbnail: animeThumbnail ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [watchlist.userId, watchlist.animeId],
        set: {
          folder: "COMPLETED",
          updatedAt: new Date(),
          ...(numericAnilistId ? { anilistId: numericAnilistId } : {}),
          ...(animeTitle ? { animeTitle } : {}),
          ...(animeThumbnail ? { animeThumbnail } : {}),
        },
        setWhere: ne(watchlist.folder, "COMPLETED"),
      });

    let anilistSynced = false;
    if (numericAnilistId) {
      const [user] = await db
        .select({ anilistAccessToken: users.anilistAccessToken })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (user?.anilistAccessToken) {
        anilistSynced = await updateAniListProgress(
          user.anilistAccessToken,
          numericAnilistId,
          totalEps,
          "COMPLETED",
        );
      }
    }

    return NextResponse.json({ ok: true, anilistSynced });
  } catch (e) {
    console.error("[complete-series POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
