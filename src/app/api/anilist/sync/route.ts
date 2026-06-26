import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchlist } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth-jwt";
import { getAniListMediaLists } from "@/lib/anilist-sync";
import { mapAniListLists } from "@/lib/anilist-import";
import { eq, and } from "drizzle-orm";

export const maxDuration = 120;

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const override = !!body.override;

  const db = getDb();
  const [user] = await db
    .select({ anilistAccessToken: users.anilistAccessToken })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user?.anilistAccessToken) {
    return NextResponse.json({ error: "AniList account not linked" }, { status: 400 });
  }

  try {
    const lists = await getAniListMediaLists(user.anilistAccessToken);
    const mapped = await mapAniListLists(lists, process.env.KITTY_API_KEY);

    const syncedAnimeIds = new Set(mapped.map((m) => m.id));
    const syncedAnilistIds = new Set(mapped.map((m) => m.anilistId));

    for (const item of mapped) {
      await db
        .insert(watchlist)
        .values({
          userId: payload.userId,
          animeId: item.id,
          folder: item.folder,
          anilistId: item.anilistId,
          malId: item.malId ?? null,
          animeTitle: item.title,
          animeThumbnail: item.thumbnail || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [watchlist.userId, watchlist.animeId],
          set: {
            folder: item.folder,
            anilistId: item.anilistId,
            malId: item.malId ?? null,
            animeTitle: item.title,
            animeThumbnail: item.thumbnail || null,
            updatedAt: new Date(),
          },
        });
    }

    let removed = 0;
    if (override) {
      const existing = await db
        .select({ animeId: watchlist.animeId, anilistId: watchlist.anilistId })
        .from(watchlist)
        .where(eq(watchlist.userId, payload.userId));

      for (const row of existing) {
        if (row.anilistId != null && syncedAnilistIds.has(row.anilistId)) {
          if (row.animeId !== String(row.anilistId)) {
            await db
              .delete(watchlist)
              .where(
                and(
                  eq(watchlist.userId, payload.userId),
                  eq(watchlist.animeId, row.animeId),
                ),
              );
            removed++;
          }
          continue;
        }

        const kept = syncedAnimeIds.has(row.animeId);
        if (!kept) {
          await db
            .delete(watchlist)
            .where(
              and(
                eq(watchlist.userId, payload.userId),
                eq(watchlist.animeId, row.animeId),
              ),
            );
          removed++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      imported: mapped.length,
      removed,
      skipped: 0,
      override,
    });
  } catch (e) {
    console.error("[anilist sync]", e);
    return NextResponse.json({ error: "AniList sync failed" }, { status: 500 });
  }
}
