import { getDb } from "@/db";
import { comments, users, roles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { attachLevelRole, getUsersXpStats } from "@/lib/user/user-xp";
import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { decryptStoredText } from "@/lib/security/ugc-crypto";

const TITLES_QUERY = `
  query ($ids: [Int], $perPage: Int) {
    Page(perPage: $perPage) {
      media(idIn: $ids, type: ANIME) {
        id
        title { english romaji }
      }
    }
  }
`;

function parseAnilistId(animeId: string): number | null {
  if (/^\d+$/.test(animeId)) return parseInt(animeId, 10);
  const match = animeId.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  return null;
}

async function fetchAnimeTitles(ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!ids.length) return map;
  try {
    const data = await queryAniList<{ Page: { media: { id: number; title: { english?: string; romaji?: string } }[] } }>(
      TITLES_QUERY,
      { ids, perPage: Math.min(ids.length, 50) },
    );
    for (const m of data.Page?.media ?? []) {
      map.set(m.id, toTitle(m.title));
    }
  } catch {
    // titles are optional enrichment
  }
  return map;
}

async function loadLatestComments(limit: number) {
  const db = getDb();
  const safeLimit = Math.min(Math.max(limit, 1), 20);

  const rows = await db
    .select({
      id: comments.id,
      body: comments.body,
      gifUrl: comments.gifUrl,
      animeId: comments.animeId,
      episodeId: comments.episodeId,
      episodeNumber: comments.episodeNumber,
      isSpoiler: comments.isSpoiler,
      likeCount: comments.likeCount,
      createdAt: comments.createdAt,
      userId: comments.userId,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
      roleColor: roles.color,
      equippedFrame: users.equippedFrame,
      equippedIcon: users.equippedIcon,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .leftJoin(roles, eq(roles.name, users.role))
    .orderBy(desc(comments.createdAt))
    .limit(safeLimit);

  const xpStatsMap = await getUsersXpStats(db, rows.map((r) => r.userId));
  const enriched = rows.map((r) =>
    attachLevelRole({ ...r, body: decryptStoredText(r.body ?? "") }, xpStatsMap),
  );

  const uniqueIds = [...new Set(rows.map((r) => parseAnilistId(r.animeId)).filter((id): id is number => id !== null))];
  const titleMap = await fetchAnimeTitles(uniqueIds);

  return enriched.map((r) => {
    const numId = parseAnilistId(r.animeId);
    const animeTitle = numId ? titleMap.get(numId) ?? null : null;
    return { ...r, animeTitle };
  });
}

const getCachedLatestComments = unstable_cache(
  loadLatestComments,
  ["comments-latest-v1"],
  { revalidate: 30 },
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") ?? "8", 10);
  const limit = Number.isFinite(limitParam) ? limitParam : 8;

  const withTitles = await getCachedLatestComments(limit);

  return Response.json(
    { comments: withTitles },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
