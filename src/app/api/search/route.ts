import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { slugsToAniListGenres } from "@/lib/search/genre-filters";

const QUERY = `
  query (
    $search: String
    $page: Int
    $perPage: Int
    $format: MediaFormat
    $status: MediaStatus
    $season: MediaSeason
    $seasonYear: Int
    $genre_in: [String]
    $genre_not: [String]
    $sort: [MediaSort]
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(
        type: ANIME
        search: $search
        format: $format
        status: $status
        season: $season
        seasonYear: $seasonYear
        genre_in: $genre_in
        genre_not: $genre_not
        sort: $sort
        isAdult: $isAdult
      ) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        format
        status
        nextAiringEpisode { episode }
        averageScore
        seasonYear
      }
    }
  }
`;

const FORMAT_MAP: Record<string, string> = {
  tv: "TV",
  movie: "MOVIE",
  ova: "OVA",
  ona: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
  "tv-short": "TV_SHORT",
};

const STATUS_MAP: Record<string, string> = {
  "finished-airing": "FINISHED",
  "currently-airing": "RELEASING",
  "not-yet-aired": "NOT_YET_RELEASED",
};

const SORT_MAP: Record<string, string> = {
  score: "SCORE_DESC",
  "name-a-z": "TITLE_ENGLISH",
  "most-watched": "POPULARITY_DESC",
  "recently-added": "START_DATE_DESC",
  "recently-updated": "UPDATED_AT_DESC",
  "released-date": "START_DATE_DESC",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const season = searchParams.get("season") || "";
  const genres = searchParams.get("genres") || "";
  const excludeGenres = searchParams.get("excludeGenres") || "";
  const yearParam = searchParams.get("year") || "";
  const sortParam = searchParams.get("sort") || "";
  // Adult content is hidden unless the client opts in (settings toggle).
  const allowAdult = searchParams.get("adult") === "1";

  const cleanQ = q.replace(/^"+|"+$/g, "").trim();

  const format = FORMAT_MAP[type] ?? undefined;
  const aniStatus = STATUS_MAP[status] ?? undefined;
  const aniSeason = season ? season.toUpperCase() : undefined;
  const genreList = genres ? slugsToAniListGenres(genres) : undefined;
  const excludeGenreList = excludeGenres ? slugsToAniListGenres(excludeGenres) : undefined;
  const seasonYear = /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : undefined;

  const sortValue = SORT_MAP[sortParam];
  const sortArr = sortValue
    ? [sortValue]
    : cleanQ
      ? ["SEARCH_MATCH"]
      : ["POPULARITY_DESC"];

  try {
    const raw = await queryAniList(QUERY, {
      search: cleanQ || undefined,
      page,
      perPage: 20,
      format,
      status: aniStatus,
      season: aniSeason,
      seasonYear,
      genre_in: genreList,
      genre_not: excludeGenreList,
      sort: sortArr,
      // false → SFW only; omit → AniList returns both SFW and adult.
      isAdult: allowAdult ? undefined : false,
    });

    const pageInfo = raw.Page?.pageInfo ?? {};
    const animes = (raw.Page?.media ?? []).map((m: any) => ({
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.coverImage?.extraLarge ?? "",
      episodes: {
        sub: m.nextAiringEpisode
          ? m.nextAiringEpisode.episode - 1
          : (m.episodes ?? 0),
        dub: 0,
      },
      type: toFormat(m.format),
      score: m.averageScore ?? null,
      year: m.seasonYear ?? null,
      status: m.status ?? null,
    }));

    const enrichedAnimes = await enrichAnimeListWithAudio(animes);

    return Response.json({
      data: {
        animes: enrichedAnimes,
        totalPages: pageInfo.lastPage ?? 1,
        hasNextPage: pageInfo.hasNextPage ?? false,
        currentPage: pageInfo.currentPage ?? page,
      },
    });
  } catch (err) {
    console.error("AniList search error:", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
