import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";

const QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(type: ANIME, search: $search, sort: SEARCH_MATCH) {
        id
        title { english romaji }
        coverImage { large }
        format
        episodes
        status
        averageScore
        seasonYear
        nextAiringEpisode { episode }
      }
    }
  }
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return Response.json({ data: { suggestions: [] } });
  }

  try {
    const raw = await queryAniList(QUERY, { search: q });
    const media = raw.Page?.media ?? [];

    const suggestions = media.map((m: any) => ({
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.coverImage?.large ?? "",
      type: toFormat(m.format),
      episodes: {
        sub: m.nextAiringEpisode
          ? m.nextAiringEpisode.episode - 1
          : (m.episodes ?? 0),
        dub: 0,
      },
      moreInfo: [
        m.seasonYear ? String(m.seasonYear) : null,
        m.episodes ? `${m.episodes} eps` : null,
        m.averageScore ? `${(m.averageScore / 10).toFixed(1)}★` : null,
      ].filter(Boolean) as string[],
    }));

    const enrichedSuggestions = await enrichAnimeListWithAudio(suggestions);

    return Response.json({ data: { suggestions: enrichedSuggestions } });
  } catch (err) {
    console.error("Suggestion search error:", err);
    return Response.json({ data: { suggestions: [] } });
  }
}
