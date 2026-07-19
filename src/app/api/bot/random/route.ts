import { authorizeBot } from "@/lib/bot/authorize-bot";
import { queryAniList } from "@/lib/oauth/anilist";
import { toBotAnimeResult, listProviders } from "@/lib/bot/bot-anime-payload";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";

export const dynamic = "force-dynamic";

const QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { lastPage }
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
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
 * GET /api/bot/random
 * Picks a random popular anime (AniList popularity pages).
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const providers = listProviders();

  try {
    // First hit: learn last page (capped), then pick a random page + entry.
    const probe = await queryAniList(QUERY, { page: 1, perPage: 1 });
    const lastPage = Math.min(
      50,
      Math.max(1, Number(probe?.Page?.pageInfo?.lastPage) || 1),
    );
    const page = 1 + Math.floor(Math.random() * lastPage);
    const raw = await queryAniList(QUERY, { page, perPage: 25 });
    const media: any[] = raw?.Page?.media ?? [];

    if (!media.length) {
      return Response.json({ result: null, providers });
    }

    const pick = media[Math.floor(Math.random() * media.length)];
    const shaped = toBotAnimeResult(pick, { includeProviders: false });
    const base = [
      {
        id: shaped.id,
        name: shaped.title,
        jname: shaped.romaji ?? "",
        poster: shaped.poster ?? "",
        type: shaped.type,
        score: shaped.score,
        year: shaped.year,
        status: shaped.status,
        episodes: shaped.episodes,
      },
    ];

    let enriched = base;
    try {
      enriched = await enrichAnimeListWithAudio(base);
    } catch (err) {
      console.error("Bot random audio enrich error:", err);
    }

    const item = enriched[0];
    const result = toBotAnimeResult(pick, {
      subEpisodes: item.episodes?.sub ?? 0,
      dubEpisodes: item.episodes?.dub ?? 0,
      includeProviders: true,
    });

    return Response.json({ result, providers });
  } catch (err) {
    console.error("Bot random error:", err);
    return Response.json({ result: null, providers }, { status: 502 });
  }
}
