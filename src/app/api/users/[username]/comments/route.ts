import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { requireVisibleProfileUser } from "@/lib/user/public-profile-access";
import {
  fetchAnimeTitles,
  formatAnimeIdLabel,
  parseAnilistId,
} from "@/lib/comments/anime-titles";
import { decryptStoredText } from "@/lib/security/ugc-crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const userOrResponse = await requireVisibleProfileUser(req, raw);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const sort = url.searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const offset = (page - 1) * limit;

  const db = getDb();
  const baseFilters = and(eq(comments.userId, userOrResponse.id), isNull(comments.parentId));

  // Bodies are encrypted at rest — load then filter/decrypt in memory.
  const rows = await db
    .select({
      id: comments.id,
      animeId: comments.animeId,
      episodeId: comments.episodeId,
      episodeNumber: comments.episodeNumber,
      body: comments.body,
      gifUrl: comments.gifUrl,
      isSpoiler: comments.isSpoiler,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(baseFilters)
    .orderBy(sort === "oldest" ? asc(comments.createdAt) : desc(comments.createdAt))
    .limit(500);

  const decrypted = rows.map((r) => ({
    ...r,
    body: decryptStoredText(r.body ?? ""),
  }));
  const filtered = q
    ? decrypted.filter((r) => r.body.toLowerCase().includes(q))
    : decrypted;
  const total = filtered.length;
  const pageRows = filtered.slice(offset, offset + limit);

  const uniqueIds = [
    ...new Set(pageRows.map((r) => parseAnilistId(r.animeId)).filter((id): id is number => id !== null)),
  ];
  const titleMap = await fetchAnimeTitles(uniqueIds);

  const enriched = pageRows.map((r) => {
    const numId = parseAnilistId(r.animeId);
    const animeTitle = numId ? titleMap.get(numId) ?? null : null;
    return {
      ...r,
      animeTitle: animeTitle ?? formatAnimeIdLabel(r.animeId),
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  });

  return NextResponse.json({
    comments: enriched,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
