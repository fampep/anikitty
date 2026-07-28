import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { searchVoiceActors, type VoiceActorSearchResult } from "@/lib/core/voice-actors";

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

const EMPTY_VA: VoiceActorSearchResult = {
  results: [],
  hasNextPage: false,
  currentPage: 1,
};

/** Don't let a slow VA AniList lookup block anime suggestions. */
const VA_SUGGESTION_TIMEOUT_MS = 900;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const allowAdult = searchParams.get("adult") === "1";

  if (!q) {
    return Response.json(
      { data: { suggestions: [], voiceActors: [] } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }

  try {
    const animePromise = queryAniList(ANIME_QUERY, {
      search: q,
      isAdult: allowAdult ? undefined : false,
    });

    const vaPromise =
      q.length >= 2
        ? withTimeout(
            searchVoiceActors(q, "", 1, 6).catch(() => EMPTY_VA),
            VA_SUGGESTION_TIMEOUT_MS,
            EMPTY_VA,
          )
        : Promise.resolve(EMPTY_VA);

    const [animeSettled, vaSettled] = await Promise.allSettled([animePromise, vaPromise]);

    const raw =
      animeSettled.status === "fulfilled" ? animeSettled.value : { Page: { media: [] } };
    const vaSearch = vaSettled.status === "fulfilled" ? vaSettled.value : EMPTY_VA;

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

    return Response.json(
      {
        data: {
          suggestions: enrichedSuggestions,
          voiceActors: vaSearch.results,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("Suggestion search error:", err);
    return Response.json({ data: { suggestions: [], voiceActors: [] } });
  }
}
