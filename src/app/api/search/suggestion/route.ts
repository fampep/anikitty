import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { searchVoiceActors, type VoiceActorSearchResult } from "@/lib/core/voice-actors";
import { genres as GENRE_OPTIONS } from "@/constants/search-filters";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ilike, sql } from "drizzle-orm";

const ANIME_QUERY = `
  query ($search: String, $isAdult: Boolean) {
    Page(page: 1, perPage: 8) {
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

const CHARACTER_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      characters(search: $search, sort: SEARCH_MATCH) {
        id
        name { full native }
        image { large }
        favourites
        media(sort: POPULARITY_DESC, page: 1, perPage: 1, type: ANIME) {
          nodes { id title { english romaji } }
        }
      }
    }
  }
`;

const STUDIO_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      studios(search: $search, sort: SEARCH_MATCH) {
        id
        name
        favourites
        isAnimationStudio
      }
    }
  }
`;

const EMPTY_VA: VoiceActorSearchResult = {
  results: [],
  hasNextPage: false,
  currentPage: 1,
};

const SUGGESTION_TIMEOUT_MS = 900;

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

function matchGenres(q: string) {
  const lower = q.toLowerCase();
  return GENRE_OPTIONS.filter(
    (g) => g.label.toLowerCase().includes(lower) || g.value.includes(lower.replace(/\s+/g, "-")),
  ).slice(0, 4);
}

async function searchUsers(q: string) {
  try {
    const db = getDb();
    const cleaned = q.replace(/[%_]/g, "").replace(/^@/, "");
    if (cleaned.length < 1) return [];
    return await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(ilike(users.username, `${cleaned}%`))
      .orderBy(sql`length(${users.username})`)
      .limit(4);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const allowAdult = searchParams.get("adult") === "1";

  if (!q) {
    return Response.json(
      {
        data: {
          suggestions: [],
          movies: [],
          voiceActors: [],
          characters: [],
          studios: [],
          users: [],
          genres: [],
        },
      },
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
            searchVoiceActors(q, "", 1, 5).catch(() => EMPTY_VA),
            SUGGESTION_TIMEOUT_MS,
            EMPTY_VA,
          )
        : Promise.resolve(EMPTY_VA);

    const characterPromise =
      q.length >= 2
        ? withTimeout(
            queryAniList(CHARACTER_QUERY, { search: q }).catch(() => ({ Page: { characters: [] } })),
            SUGGESTION_TIMEOUT_MS,
            { Page: { characters: [] } },
          )
        : Promise.resolve({ Page: { characters: [] } });

    const studioPromise =
      q.length >= 2
        ? withTimeout(
            queryAniList(STUDIO_QUERY, { search: q }).catch(() => ({ Page: { studios: [] } })),
            SUGGESTION_TIMEOUT_MS,
            { Page: { studios: [] } },
          )
        : Promise.resolve({ Page: { studios: [] } });

    const usersPromise = withTimeout(searchUsers(q), SUGGESTION_TIMEOUT_MS, []);

    const [animeSettled, vaSettled, charSettled, studioSettled, usersSettled] =
      await Promise.allSettled([
        animePromise,
        vaPromise,
        characterPromise,
        studioPromise,
        usersPromise,
      ]);

    const raw =
      animeSettled.status === "fulfilled" ? animeSettled.value : { Page: { media: [] } };
    const vaSearch = vaSettled.status === "fulfilled" ? vaSettled.value : EMPTY_VA;
    const charRaw =
      charSettled.status === "fulfilled" ? charSettled.value : { Page: { characters: [] } };
    const studioRaw =
      studioSettled.status === "fulfilled" ? studioSettled.value : { Page: { studios: [] } };
    const userRows = usersSettled.status === "fulfilled" ? usersSettled.value : [];

    const media = raw.Page?.media ?? [];

    const mapSuggestion = (m: any) => ({
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
    });

    const allSuggestions = media.map(mapSuggestion);
    const movies = allSuggestions.filter((s: { type: string }) =>
      /movie/i.test(s.type),
    );
    const animeOnly = allSuggestions.filter((s: { type: string }) => !/movie/i.test(s.type));

    const enrichedAnime = await enrichAnimeListWithAudio(animeOnly);
    const enrichedMovies = await enrichAnimeListWithAudio(movies);

    const characters = (charRaw.Page?.characters ?? []).map((c: any) => {
      const from = c.media?.nodes?.[0];
      return {
        id: String(c.id),
        name: c.name?.full ?? "Unknown",
        native: c.name?.native ?? null,
        image: c.image?.large ?? null,
        favourites: c.favourites ?? null,
        mediaId: from?.id ? String(from.id) : null,
        mediaTitle: from ? toTitle(from.title) : null,
      };
    });

    const studios = (studioRaw.Page?.studios ?? [])
      .filter((s: any) => s?.id && s?.name)
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        favourites: s.favourites ?? null,
        isAnimationStudio: s.isAnimationStudio !== false,
      }));

    const genreMatches = matchGenres(q).map((g) => ({
      slug: g.value,
      name: g.label,
    }));

    return Response.json(
      {
        data: {
          suggestions: enrichedAnime,
          movies: enrichedMovies,
          voiceActors: vaSearch.results,
          characters,
          studios,
          users: userRows.map((u) => ({
            username: u.username,
            avatarUrl: u.avatarUrl,
          })),
          genres: genreMatches,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("Suggestion search error:", err);
    return Response.json({
      data: {
        suggestions: [],
        movies: [],
        voiceActors: [],
        characters: [],
        studios: [],
        users: [],
        genres: [],
      },
    });
  }
}
