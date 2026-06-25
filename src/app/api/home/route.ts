import { queryAniList, toTitle, toFormat } from "@/lib/anilist";

const QUERY = `
  query {
    spotlight: Page(page: 1, perPage: 10) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title { english romaji }
        coverImage { extraLarge }
        bannerImage
        description(asHtml: false)
        episodes
        nextAiringEpisode { episode }
        format
      }
    }
    trending: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format trending averageScore seasonYear status
      }
    }
    popular: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    favorite: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: FAVOURITES_DESC) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    latest: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: END_DATE_DESC, status: FINISHED) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
    upcoming: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC, status: NOT_YET_RELEASED) {
        id title { english romaji } coverImage { extraLarge } episodes format averageScore seasonYear status
      }
    }
  }
`;

function toAnime(m: any) {
  return {
    id: String(m.id),
    name: toTitle(m.title),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.extraLarge ?? "",
    episodes: {
      sub: m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes ?? 0),
      dub: 0,
    },
    type: toFormat(m.format),
    rank: m.trending ?? undefined,
    score: m.averageScore ?? null,
    year: m.seasonYear ?? null,
    status: m.status ?? null,
  };
}

export async function GET() {
  try {
    const raw = await queryAniList(QUERY);

    const spotlightAnimes = (raw.spotlight?.media ?? []).map((m: any, i: number) => ({
      rank: i + 1,
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
      description: (m.description ?? "").replace(/<[^>]*>/g, ""),
      episodes: {
        sub: m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : (m.episodes ?? 0),
        dub: 0,
      },
      type: toFormat(m.format),
      otherInfo: [],
    }));

    const data = {
      spotlightAnimes,
      trendingAnimes: (raw.trending?.media ?? []).map(toAnime),
      latestEpisodeAnimes: (raw.popular?.media ?? []).map(toAnime),
      mostFavoriteAnimes: (raw.favorite?.media ?? []).map(toAnime),
      mostPopularAnimes: (raw.popular?.media ?? []).map(toAnime),
      latestCompletedAnimes: (raw.latest?.media ?? []).map(toAnime),
      topUpcomingAnimes: (raw.upcoming?.media ?? []).map(toAnime),
      topAiringAnimes: [],
      top10Animes: { today: [], week: [], month: [] },
      genres: [],
    };

    return Response.json({ data });
  } catch (err) {
    console.error("AniList home error:", err);
    return Response.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
