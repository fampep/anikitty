import { authorizeBot } from "@/lib/bot/authorize-bot";
import { queryAniList } from "@/lib/oauth/anilist";
import { toBotAnimeResult, listProviders } from "@/lib/bot/bot-anime-payload";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";

export const dynamic = "force-dynamic";

const QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
        id
        title { english romaji }
        coverImage { large extraLarge }
        format
        episodes
        status
        averageScore
        seasonYear
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

/**
 * GET /api/bot/trending?limit=8
 * Trending anime from AniList, shaped like /api/bot/search results.
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") || "8", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(15, Math.max(1, limitRaw))
    : 8;

  const providers = listProviders();

  try {
    const raw = await queryAniList(QUERY, { perPage: limit });
    const media = raw?.Page?.media ?? [];

    const base = media.map((m: any) => {
      const shaped = toBotAnimeResult(m, { includeProviders: false });
      return {
        id: shaped.id,
        name: shaped.title,
        jname: shaped.romaji ?? "",
        poster: shaped.poster ?? "",
        type: shaped.type,
        score: shaped.score,
        year: shaped.year,
        status: shaped.status,
        episodes: shaped.episodes,
      };
    });

    let enriched = base;
    try {
      enriched = await enrichAnimeListWithAudio(base);
    } catch (err) {
      console.error("Bot trending audio enrich error:", err);
    }

    const results = enriched.map((item: (typeof base)[number], i: number) => {
      const m = media[i];
      return toBotAnimeResult(m, {
        subEpisodes: item.episodes?.sub ?? 0,
        dubEpisodes: item.episodes?.dub ?? 0,
        includeProviders: true,
      });
    });

    return Response.json({
      count: results.length,
      results,
      providers,
    });
  } catch (err) {
    console.error("Bot trending error:", err);
    return Response.json({ count: 0, results: [], providers });
  }
}
