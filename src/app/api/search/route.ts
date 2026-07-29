import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { slugsToAniListGenres } from "@/lib/search/genre-filters";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";

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
    $genre_not_in: [String]
    $tag_in: [String]
    $sort: [MediaSort]
    $isAdult: Boolean
    $source: MediaSource
    $countryOfOrigin: CountryCode
    $studios: [Int]
    $episodes_greater: Int
    $episodes_lesser: Int
    $duration_greater: Int
    $duration_lesser: Int
    $averageScore_greater: Int
    $startDate_greater: FuzzyDateInt
    $startDate_lesser: FuzzyDateInt
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
        genre_not_in: $genre_not_in
        tag_in: $tag_in
        sort: $sort
        isAdult: $isAdult
        source: $source
        countryOfOrigin: $countryOfOrigin
        studios: $studios
        episodes_greater: $episodes_greater
        episodes_lesser: $episodes_lesser
        duration_greater: $duration_greater
        duration_lesser: $duration_lesser
        averageScore_greater: $averageScore_greater
        startDate_greater: $startDate_greater
        startDate_lesser: $startDate_lesser
      ) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        format
        status
        nextAiringEpisode { episode airingAt }
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
  popularity: "POPULARITY_DESC",
  trending: "TRENDING_DESC",
  "recently-added": "START_DATE_DESC",
  "recently-updated": "UPDATED_AT_DESC",
  "released-date": "START_DATE_DESC",
};

const SOURCE_MAP: Record<string, string> = {
  original: "ORIGINAL",
  manga: "MANGA",
  light_novel: "LIGHT_NOVEL",
  visual_novel: "VISUAL_NOVEL",
  video_game: "VIDEO_GAME",
  novel: "NOVEL",
  other: "OTHER",
  doujinshi: "DOUJINSHI",
  anime: "ANIME",
  web_novel: "WEB_NOVEL",
  live_action: "LIVE_ACTION",
  game: "GAME",
  comic: "COMIC",
};

const RATED_SCORE: Record<string, number> = {
  g: 0,
  pg: 0,
  "pg-13": 0,
  r: 0,
  "r+": 0,
};

function parseRange(
  preset: string | null,
  explicitMin: string | null,
  explicitMax: string | null,
): { greater?: number; lesser?: number } {
  let greater: number | undefined;
  let lesser: number | undefined;

  if (explicitMin && /^\d+$/.test(explicitMin)) greater = parseInt(explicitMin, 10) - 1;
  if (explicitMax && /^\d+$/.test(explicitMax)) lesser = parseInt(explicitMax, 10) + 1;

  if (preset) {
    if (preset.endsWith("+")) {
      const n = parseInt(preset, 10);
      if (!isNaN(n)) greater = n - 1;
    } else {
      const [lo, hi] = preset.split("-").map((x) => parseInt(x, 10));
      if (!isNaN(lo)) greater = lo - 1;
      if (!isNaN(hi)) lesser = hi + 1;
    }
  }

  return { greater, lesser };
}

function decadeToDateBounds(decade: string): { greater?: number; lesser?: number } {
  if (!/^\d{4}$/.test(decade)) return {};
  const start = parseInt(decade, 10);
  // FuzzyDateInt: YYYYMMDD
  return {
    greater: start * 10000,
    lesser: (start + 10) * 10000,
  };
}

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
  const decadeParam = searchParams.get("decade") || "";
  const sortParam = searchParams.get("sort") || "";
  const sourceParam = searchParams.get("source") || "";
  const countryParam = searchParams.get("country") || "";
  const studioParam = searchParams.get("studio") || "";
  const tagsParam = searchParams.get("tags") || "";
  const demographicParam = searchParams.get("demographic") || "";
  const scoreMinParam = searchParams.get("scoreMin") || "";
  const ratedParam = searchParams.get("rated") || "";
  const languageParam = searchParams.get("language") || "";
  const episodesPreset = searchParams.get("episodes") || "";
  const runtimePreset = searchParams.get("runtime") || "";
  const episodeMin = searchParams.get("episodeMin");
  const episodeMax = searchParams.get("episodeMax");
  const durationMin = searchParams.get("durationMin");
  const durationMax = searchParams.get("durationMax");
  const allowAdult = searchParams.get("adult") === "1";

  const cleanQ = q.replace(/^"+|"+$/g, "").trim();

  const format = FORMAT_MAP[type] ?? undefined;
  const aniStatus = STATUS_MAP[status] ?? undefined;
  const aniSeason = season ? season.toUpperCase() : undefined;
  let genreList = genres ? slugsToAniListGenres(genres) : undefined;
  const excludeGenreList = excludeGenres ? slugsToAniListGenres(excludeGenres) : undefined;
  const seasonYear = /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : undefined;

  // Demographic slugs are AniList genres (Shounen, etc.)
  if (demographicParam) {
    const demo = slugsToAniListGenres(demographicParam);
    genreList = [...(genreList ?? []), ...demo];
  }

  const tagList = [
    ...(tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []),
  ];

  const source = SOURCE_MAP[sourceParam] ?? undefined;
  const countryOfOrigin = /^[A-Z]{2}$/.test(countryParam) ? countryParam : undefined;
  const studioId = /^\d+$/.test(studioParam) ? [parseInt(studioParam, 10)] : undefined;

  const epRange = parseRange(episodesPreset || null, episodeMin, episodeMax);
  const durRange = parseRange(runtimePreset || null, durationMin, durationMax);

  let averageScore_greater: number | undefined;
  if (/^\d+$/.test(scoreMinParam)) {
    averageScore_greater = parseInt(scoreMinParam, 10) - 1;
  } else if (ratedParam && RATED_SCORE[ratedParam] != null) {
    // rated is UI-only for now; keep param accepted without breaking
  }

  let startDate_greater: number | undefined;
  let startDate_lesser: number | undefined;
  if (decadeParam && !seasonYear) {
    const bounds = decadeToDateBounds(decadeParam);
    startDate_greater = bounds.greater;
    startDate_lesser = bounds.lesser;
  }

  const sortValue = SORT_MAP[sortParam];
  const sortArr = sortValue
    ? [sortValue]
    : cleanQ
      ? ["SEARCH_MATCH"]
      : ["POPULARITY_DESC"];

  // Language filter is applied client-side via audio enrichment metadata when possible;
  // AniList has no native sub/dub filter.
  void languageParam;

  try {
    const raw = await queryAniList(QUERY, {
      search: cleanQ || undefined,
      page,
      perPage: 20,
      format,
      status: aniStatus,
      season: aniSeason,
      seasonYear,
      genre_in: genreList?.length ? genreList : undefined,
      genre_not_in: excludeGenreList?.length ? excludeGenreList : undefined,
      tag_in: tagList.length ? tagList : undefined,
      sort: sortArr,
      isAdult: allowAdult ? undefined : false,
      source,
      countryOfOrigin,
      studios: studioId,
      episodes_greater: epRange.greater,
      episodes_lesser: epRange.lesser,
      duration_greater: durRange.greater,
      duration_lesser: durRange.lesser,
      averageScore_greater,
      startDate_greater,
      startDate_lesser,
    });

    const pageInfo = raw.Page?.pageInfo ?? {};
    const animes = (raw.Page?.media ?? []).map((m: any) => ({
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.coverImage?.extraLarge ?? "",
      episodes: {
        sub: airedCountFromAnilist(m.nextAiringEpisode, {
          status: m.status,
          episodes: m.episodes,
        }),
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
        totalResults: pageInfo.total ?? 0,
        hasNextPage: pageInfo.hasNextPage ?? false,
        currentPage: pageInfo.currentPage ?? page,
      },
    });
  } catch (err) {
    console.error("AniList search error:", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
