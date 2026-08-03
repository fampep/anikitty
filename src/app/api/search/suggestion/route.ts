import { queryAniListSearch, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { searchMediaOnMal } from "@/lib/anime/mal-fallback";
import {
  searchLocalAnimeMetadata,
  upsertAnimeMetadataHints,
} from "@/lib/anime/anime-metadata-store";
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

const STAFF_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 8) {
      staff(search: $search, sort: SEARCH_MATCH) {
        id
        name { full native }
        image { large }
        languageV2
        primaryOccupations
      }
    }
  }
`;

const EMPTY_PAYLOAD = {
  suggestions: [] as unknown[],
  movies: [] as unknown[],
  voiceActors: [] as unknown[],
  characters: [] as unknown[],
  studios: [] as unknown[],
  users: [] as unknown[],
  genres: [] as unknown[],
};

/** Absolute ceiling for the primary anime query (client-visible). */
const ANIME_BUDGET_MS = 5_500;
/** Secondary sections drop out rather than delaying anime. */
const SECONDARY_BUDGET_MS = 2_200;
const ENRICH_TIMEOUT_MS = 600;
const USERS_TIMEOUT_MS = 700;

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

function isVoiceOccupation(occupations: string[] | null | undefined): boolean {
  const occ = (occupations ?? []).map((o) => o.toLowerCase());
  if (occ.length === 0) return true;
  return occ.some((o) => o.includes("voice") || o.includes("actor") || o.includes("seiyuu"));
}

async function searchUsers(q: string) {
  try {
    if (!process.env.DATABASE_URL) return [];
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

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const allowAdult = searchParams.get("adult") === "1";

  if (!q) {
    return Response.json({ data: EMPTY_PAYLOAD }, { headers: cacheHeaders() });
  }

  try {
    // AniList Page accepts only ONE child field — start queries in parallel,
    // but the response waits on anime first so secondary fields can't stall it.
    // Every call uses the fast AniList client (6s / 2 attempts max).
    const animePromise = queryAniListSearch<{ Page?: { media?: any[] | null } | null }>(
      ANIME_QUERY,
      {
        search: q,
        isAdult: allowAdult ? undefined : false,
      },
    ).catch(() => null);

    const includeSecondary = q.length >= 2;

    const characterPromise = includeSecondary
      ? queryAniListSearch<{ Page?: { characters?: any[] | null } | null }>(CHARACTER_QUERY, {
          search: q,
        }).catch(() => ({ Page: { characters: [] as any[] } }))
      : Promise.resolve({ Page: { characters: [] as any[] } });

    const studioPromise = includeSecondary
      ? queryAniListSearch<{ Page?: { studios?: any[] | null } | null }>(STUDIO_QUERY, {
          search: q,
        }).catch(() => ({ Page: { studios: [] as any[] } }))
      : Promise.resolve({ Page: { studios: [] as any[] } });

    const staffPromise = includeSecondary
      ? queryAniListSearch<{ Page?: { staff?: any[] | null } | null }>(STAFF_QUERY, {
          search: q,
        }).catch(() => ({ Page: { staff: [] as any[] } }))
      : Promise.resolve({ Page: { staff: [] as any[] } });

    const usersPromise = searchUsers(q);

    const startedAt = Date.now();
    const raw = await withTimeout(animePromise, ANIME_BUDGET_MS, null);

    // Give secondaries whatever budget remains (they were already in flight).
    const remaining = Math.max(
      250,
      SECONDARY_BUDGET_MS - (Date.now() - startedAt),
    );

    const [charRaw, studioRaw, staffRaw, userRows] = await Promise.all([
      withTimeout(characterPromise, remaining, { Page: { characters: [] as any[] } }),
      withTimeout(studioPromise, remaining, { Page: { studios: [] as any[] } }),
      withTimeout(staffPromise, remaining, { Page: { staff: [] as any[] } }),
      withTimeout(usersPromise, Math.min(remaining, USERS_TIMEOUT_MS), []),
    ]);

    const media = raw?.Page?.media ?? [];

    if (media.length > 0) {
      void upsertAnimeMetadataHints(
        media.map((m: any) => ({
          anilistId: Number(m.id),
          title: toTitle(m.title),
          titleEnglish: m.title?.english ?? null,
          titleRomaji: m.title?.romaji ?? null,
          coverImage: m.coverImage?.large ?? null,
          episodes: typeof m.episodes === "number" ? m.episodes : null,
          format: m.format ?? null,
          status: m.status ?? null,
          seasonYear: typeof m.seasonYear === "number" ? m.seasonYear : null,
          averageScore: typeof m.averageScore === "number" ? m.averageScore : null,
        })),
      );
    }

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
      status: m.status ?? null,
    });

    let allSuggestions = media.map(mapSuggestion);

    // AniList miss → MAL, which shares the AniList media shape here.
    if (!raw && allSuggestions.length === 0) {
      const fallback = await searchMediaOnMal(q, 8).catch(() => []);
      allSuggestions = fallback.map(mapSuggestion);
    }

    // Still nothing → local title cache for typeahead anime results.
    if (!raw && allSuggestions.length === 0) {
      const local = await searchLocalAnimeMetadata(q, 8).catch(() => []);
      allSuggestions = local.map((m) => ({
        id: String(m.anilistId),
        name: m.title || m.titleEnglish || m.titleRomaji || "Unknown",
        jname: m.titleRomaji ?? "",
        poster: m.coverImage ?? "",
        type: toFormat(m.format),
        episodes: { sub: m.episodes ?? 0, dub: 0 },
        moreInfo: [
          m.seasonYear ? String(m.seasonYear) : null,
          m.episodes ? `${m.episodes} eps` : null,
          m.averageScore ? `${(m.averageScore / 10).toFixed(1)}★` : null,
        ].filter(Boolean) as string[],
        status: m.status ?? null,
      }));
    }

    const movies = allSuggestions.filter((s: { type: string }) => /movie/i.test(s.type));
    const animeOnly = allSuggestions.filter((s: { type: string }) => !/movie/i.test(s.type));

    // Never block typeahead on Postgres / Kitty audio enrichment.
    const [enrichedAnime, enrichedMovies] = await Promise.all([
      withTimeout(enrichAnimeListWithAudio(animeOnly), ENRICH_TIMEOUT_MS, animeOnly),
      withTimeout(enrichAnimeListWithAudio(movies), ENRICH_TIMEOUT_MS, movies),
    ]);

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

    const voiceActors = (staffRaw.Page?.staff ?? [])
      .filter((s: any) => isVoiceOccupation(s.primaryOccupations))
      .slice(0, 5)
      .map((s: any) => ({
        id: s.id,
        name: s.name?.full ?? "Unknown",
        native: s.name?.native ?? null,
        image: s.image?.large ?? null,
        language: s.languageV2 ?? null,
      }));

    const genreMatches = matchGenres(q).map((g) => ({
      slug: g.value,
      name: g.label,
    }));

    // Complete AniList failure with nothing local → retryable so the client
    // doesn't treat a blip as permanent "no results".
    if (
      !raw &&
      enrichedAnime.length === 0 &&
      enrichedMovies.length === 0 &&
      genreMatches.length === 0 &&
      userRows.length === 0
    ) {
      return Response.json(
        { error: "Search temporarily unavailable", data: EMPTY_PAYLOAD },
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "1" },
        },
      );
    }

    return Response.json(
      {
        data: {
          suggestions: enrichedAnime,
          movies: enrichedMovies,
          voiceActors,
          characters,
          studios,
          users: userRows.map((u) => ({
            username: u.username,
            avatarUrl: u.avatarUrl,
          })),
          genres: genreMatches,
        },
      },
      { headers: cacheHeaders() },
    );
  } catch (err) {
    console.error("Suggestion search error:", err);
    return Response.json(
      { error: "Search temporarily unavailable", data: EMPTY_PAYLOAD },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "1", "X-Search-Degraded": "1" },
      },
    );
  }
}
