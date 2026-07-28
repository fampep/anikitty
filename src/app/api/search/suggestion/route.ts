import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { searchVoiceActors } from "@/lib/core/voice-actors";

const ANIME_QUERY = `
  query ($search: String, $isAdult: Boolean) {
    Page(page: 1, perPage: 6) {
      media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: $isAdult) {
        id
        title { english romaji }
        coverImage { large }
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const allowAdult = searchParams.get("adult") === "1";

  if (!q) {
    return Response.json({ data: { suggestions: [], voiceActors: [] } });
  }

  try {
    const [raw, vaSearch] = await Promise.all([
      queryAniList(ANIME_QUERY, {
        search: q,
        isAdult: allowAdult ? undefined : false,
      }),
      q.length >= 2
        ? searchVoiceActors(q, "", 1, 6).catch(() => ({
            results: [],
            hasNextPage: false,
            currentPage: 1,
          }))
        : Promise.resolve({ results: [], hasNextPage: false, currentPage: 1 }),
    ]);

    const media = raw.Page?.media ?? [];

    const suggestions = media.map((m: any) => ({
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.coverImage?.large ?? "",
      type: toFormat(m.format),
      episodes: {
        sub: airedCountFromAnilist(m.nextAiringEpisode, {
          status: m.status,
          episodes: m.episodes,
        }),
        dub: 0,
      },
      moreInfo: [
        m.seasonYear ? String(m.seasonYear) : null,
        m.episodes ? `${m.episodes} eps` : null,
        m.averageScore ? `${(m.averageScore / 10).toFixed(1)}★` : null,
      ].filter(Boolean) as string[],
    }));

    const enrichedSuggestions = await enrichAnimeListWithAudio(suggestions);

    return Response.json({
      data: {
        suggestions: enrichedSuggestions,
        voiceActors: vaSearch.results,
      },
    });
  } catch (err) {
    console.error("Suggestion search error:", err);
    return Response.json({ data: { suggestions: [], voiceActors: [] } });
  }
}
