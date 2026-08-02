import { queryAniListSearch } from "@/lib/oauth/anilist";

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
    const raw = await queryAniListSearch(QUERY, { page });
    const media = raw?.Page?.media?.[0];

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
