import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, watchlist } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getAniListMediaLists } from "@/lib/oauth/anilist-sync";
import { mapAniListLists } from "@/lib/oauth/anilist-import";
import {
  isAniListAuthError,
  resolveAniListAccessToken,
} from "@/lib/oauth/anilist-oauth";
import { eq, and } from "drizzle-orm";

export const maxDuration = 120;

const UPSERT_CHUNK = 25;

async function fetchMediaLists(userId: string) {
  let accessToken = await resolveAniListAccessToken(userId);
  if (!accessToken) return null;

  try {
    return { accessToken, lists: await getAniListMediaLists(accessToken) };
  } catch (e) {
    if (!isAniListAuthError(e)) throw e;
    accessToken = await resolveAniListAccessToken(userId, { forceRefresh: true });
    if (!accessToken) return null;
    return { accessToken, lists: await getAniListMediaLists(accessToken) };
  }
}

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
    const fetched = await fetchMediaLists(payload.userId);
    if (!fetched) {
      return NextResponse.json(
        { error: "AniList session expired — reconnect in Settings" },
        { status: 401 },
      );
    }

    const { lists } = fetched;
    const mapped = await mapAniListLists(lists, process.env.KITTY_API_KEY, {
      skipKittyLookup: true,
    });

    if (mapped.length === 0) {
      return NextResponse.json({
        ok: true,
        imported: 0,
        removed: 0,
        skipped: 0,
        override,
        message: "No anime found on your AniList",
      });
    }

    const syncedAnimeIds = new Set(mapped.map((m) => m.id));
    const syncedAnilistIds = new Set(mapped.map((m) => m.anilistId));

    for (let i = 0; i < mapped.length; i += UPSERT_CHUNK) {
      const chunk = mapped.slice(i, i + UPSERT_CHUNK);
      await Promise.all(
        chunk.map((item) =>
          db
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
            }),
        ),
      );
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
    if (isAniListAuthError(e)) {
      return NextResponse.json(
        { error: "AniList session expired — reconnect in Settings" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "AniList sync failed" }, { status: 500 });
  }
}
