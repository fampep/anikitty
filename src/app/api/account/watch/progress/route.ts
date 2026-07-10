import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchProgress, watchlist } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { parseEpisodeNumber, updateAniListProgress } from "@/lib/oauth/anilist-sync";
import { grantEpisodeKittycoins } from "@/lib/shop/kittycoins";
import { and, eq, isNull, ne } from "drizzle-orm";

function isWatchedEnough(current: number, duration: number): boolean {
  if (duration <= 0) return false;
  return current >= Math.max(Math.floor(duration * 0.9), 30);
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      animeId,
      episodeId,
      currentTime,
      duration,
      language,
      server,
      anilistId,
      animeTitle,
      animeThumbnail,
      episodeNumber,
      totalEpisodes,
    } = body;

    if (!animeId || !episodeId)
      return NextResponse.json({ error: "animeId and episodeId are required" }, { status: 400 });

    const db = getDb();
    const roundedCurrent = Math.round(currentTime ?? 0);
    const roundedDuration = Math.round(duration ?? 0);

    await db
      .insert(watchProgress)
      .values({
        userId: payload.userId,
        animeId,
        episodeId,
        currentTime: roundedCurrent,
        duration: roundedDuration,
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
          currentTime: roundedCurrent,
          duration: roundedDuration,
          language: language ?? "sub",
          server: server ?? null,
          ...(anilistId ? { anilistId } : {}),
          ...(animeTitle ? { animeTitle } : {}),
          ...(animeThumbnail ? { animeThumbnail } : {}),
          updatedAt: new Date(),
        },
      });

    const watchedEnough = isWatchedEnough(roundedCurrent, roundedDuration);

    if (watchedEnough) {
      void grantEpisodeKittycoins(db, payload.userId, animeId, episodeId);
    }

    const episodeNum =
      (typeof episodeNumber === "number" && episodeNumber > 0
        ? episodeNumber
        : parseEpisodeNumber(episodeId)) ?? null;
    const totalEps = typeof totalEpisodes === "number" ? totalEpisodes : 0;
    // Finishing the final episode completes the title.
    const isLastEpisode =
      watchedEnough && episodeNum != null && totalEps > 0 && episodeNum >= totalEps;

    // Move the title into the Completed list (create the entry if it wasn't
    // tracked). Only touches rows not already Completed to avoid churn.
    if (isLastEpisode) {
      void db
        .insert(watchlist)
        .values({
          userId: payload.userId,
          animeId,
          folder: "COMPLETED",
          anilistId: anilistId ?? null,
          animeTitle: animeTitle ?? null,
          animeThumbnail: animeThumbnail ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [watchlist.userId, watchlist.animeId],
          set: {
            folder: "COMPLETED",
            updatedAt: new Date(),
            ...(anilistId ? { anilistId } : {}),
            ...(animeTitle ? { animeTitle } : {}),
            ...(animeThumbnail ? { animeThumbnail } : {}),
          },
          setWhere: ne(watchlist.folder, "COMPLETED"),
        })
        .catch((e) => console.error("[progress POST] complete watchlist failed:", e));
    }

    // Sync to AniList once per episode — not on every progress tick past 90%.
    if (anilistId && watchedEnough) {
      if (episodeNum) {
        void (async () => {
          let claimedId: string | null = null;
          try {
            const [claimed] = await db
              .update(watchProgress)
              .set({ anilistSyncedAt: new Date() })
              .where(
                and(
                  eq(watchProgress.userId, payload.userId),
                  eq(watchProgress.animeId, animeId),
                  eq(watchProgress.episodeId, episodeId),
                  isNull(watchProgress.anilistSyncedAt),
                ),
              )
              .returning({ id: watchProgress.id });

            if (!claimed) return;
            claimedId = claimed.id;

            const [user] = await db
              .select({ anilistAccessToken: users.anilistAccessToken })
              .from(users)
              .where(eq(users.id, payload.userId))
              .limit(1);

            if (!user?.anilistAccessToken) {
              await db
                .update(watchProgress)
                .set({ anilistSyncedAt: null })
                .where(eq(watchProgress.id, claimed.id));
              return;
            }

            const ok = await updateAniListProgress(
              user.anilistAccessToken,
              anilistId,
              episodeNum,
              isLastEpisode ? "COMPLETED" : "CURRENT",
            );

            if (!ok && claimedId) {
              await db
                .update(watchProgress)
                .set({ anilistSyncedAt: null })
                .where(eq(watchProgress.id, claimedId));
            }
          } catch (e) {
            console.error("[progress POST] AniList sync failed:", e);
            if (claimedId) {
              await db
                .update(watchProgress)
                .set({ anilistSyncedAt: null })
                .where(eq(watchProgress.id, claimedId))
                .catch(() => {});
            }
          }
        })();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[progress POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
