import { queryAniListSearch } from "@/lib/oauth/anilist";
import { fetchMalRanking } from "@/lib/anime/mal-fallback";

export const dynamic = "force-dynamic";

const QUERY = `
  query ($page: Int) {
    Page(page: $page, perPage: 1) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        id
        idMal
        title { romaji english }
      }
    }
  }
`;

/**
 * GET /api/anime/random — one popular title, chosen at random.
 *
 * Rather than pulling a page and picking locally, this jumps to a random page
 * of the popularity-sorted list so the pick isn't biased toward the top 50.
 * Capped at 500 pages to stay inside genuinely popular titles.
 */
export async function GET() {
  try {
    const page = 1 + Math.floor(Math.random() * 500);
    let media: { id?: number; title?: { english?: string; romaji?: string } } | undefined;

    try {
      const raw = await queryAniListSearch(QUERY, { page });
      media = raw?.Page?.media?.[0];
    } catch (err) {
      // AniList is down — MAL's popularity ranking has no deep paging, so pick
      // from the top slice instead. Less varied, but still a random pick.
      console.error("[random] AniList query failed, falling back to MAL:", err);
      const pool = await fetchMalRanking("bypopularity", 100).catch(() => []);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) {
        media = {
          id: pick.id,
          title: {
            english: pick.title.english ?? undefined,
            romaji: pick.title.romaji ?? undefined,
          },
        };
      }
    }

    if (!media?.id) {
      return Response.json({ error: "No anime found" }, { status: 502 });
    }

    return Response.json({
      id: String(media.id),
      title: media.title?.english ?? media.title?.romaji ?? null,
    });
  } catch {
    return Response.json({ error: "Random pick failed" }, { status: 502 });
  }
}
