import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import type { IAnime } from "@/types/anime";

const STUDIO_QUERY = `
  query ($id: Int) {
    Studio(id: $id) {
      id
      name
      isAnimationStudio
      favourites
      siteUrl
      media(sort: POPULARITY_DESC, page: 1, perPage: 500, isMain: true) {
        pageInfo { total }
        nodes {
          id
          title { english romaji }
          coverImage { large extraLarge }
          bannerImage
          format
          episodes
          status
          season
          seasonYear
          averageScore
          popularity
          startDate { year month day }
          endDate { year month day }
          nextAiringEpisode { episode airingAt }
          isAdult
        }
      }
    }
  }
`;

const STUDIO_TOP_RATED_QUERY = `
  query ($id: Int) {
    Studio(id: $id) {
      media(sort: SCORE_DESC, page: 1, perPage: 300, isMain: true) {
        nodes {
          id
          title { english romaji }
          coverImage { large }
          format
          episodes
          status
          seasonYear
          averageScore
          nextAiringEpisode { episode airingAt }
          isAdult
        }
      }
    }
  }
`;

const STUDIO_UPCOMING_QUERY = `
  query ($id: Int) {
    Studio(id: $id) {
      media(sort: START_DATE, page: 1, perPage: 300, isMain: true, status: NOT_YET_RELEASED) {
        nodes {
          id
          title { english romaji }
          coverImage { large }
          format
          episodes
          status
          season
          seasonYear
          averageScore
          startDate { year month day }
          nextAiringEpisode { episode airingAt }
          isAdult
        }
      }
    }
  }
`;

export type StudioStaffMember = {
  id: string;
  name: string;
  role: string;
  image: string | null;
};

export type StudioPayload = {
  id: string;
  name: string;
  isAnimationStudio: boolean;
  favourites: number | null;
  siteUrl: string | null;
  /** Approximate founded year from earliest main production. */
  foundedYear: number | null;
  location: string | null;
  logo: string | null;
  banner: string | null;
  totalProductions: number;
  averageScore: number | null;
  popular: IAnime[];
  highestRated: IAnime[];
  upcoming: IAnime[];
  history: Array<{ year: number; count: number }>;
  staff: StudioStaffMember[];
};

function toAnime(m: any): IAnime {
  return {
    id: String(m.id),
    name: toTitle(m.title ?? {}),
    jname: m.title?.romaji ?? "",
    poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? "",
    episodes: {
      sub: airedCountFromAnilist(m.nextAiringEpisode, {
        status: m.status,
        episodes: m.episodes,
      }),
      dub: 0,
    },
    type: toFormat(m.format) as IAnime["type"],
    score: m.averageScore ?? null,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    status: m.status ?? null,
  };
}

export async function getStudioPage(id: number, allowAdult = false): Promise<StudioPayload | null> {
  const [main, rated, upcomingRaw] = await Promise.all([
    queryAniList<{ Studio?: any }>(STUDIO_QUERY, { id }),
    queryAniList<{ Studio?: any }>(STUDIO_TOP_RATED_QUERY, { id }).catch(() => null),
    queryAniList<{ Studio?: any }>(STUDIO_UPCOMING_QUERY, { id }).catch(() => null),
  ]);

  const studio = main.Studio;
  if (!studio) return null;

  const filterAdult = (nodes: any[]) =>
    (nodes ?? []).filter((n) => n && (allowAdult || !n.isAdult));

  const popularNodes = filterAdult(studio.media?.nodes ?? []);
  const ratedNodes = filterAdult(rated?.Studio?.media?.nodes ?? []);
  const upcomingNodes = filterAdult(upcomingRaw?.Studio?.media?.nodes ?? []);

  const years = popularNodes
    .map((n: any) => n.startDate?.year ?? n.seasonYear)
    .filter((y: unknown): y is number => typeof y === "number" && y > 1900);

  const foundedYear = years.length ? Math.min(...years) : null;

  const yearCounts = new Map<number, number>();
  for (const y of years) yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
  const history = [...yearCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }));

  const scores = popularNodes
    .map((n: any) => n.averageScore)
    .filter((s: unknown): s is number => typeof s === "number");
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const banner =
    popularNodes.find((n: any) => n.bannerImage)?.bannerImage ??
    popularNodes[0]?.coverImage?.extraLarge ??
    null;
  const logo = popularNodes[0]?.coverImage?.large ?? null;

  let popular = popularNodes.map(toAnime);
  let highestRated = ratedNodes.map(toAnime);
  let upcoming = upcomingNodes.map(toAnime);

  try {
    const combined = [...popular, ...highestRated, ...upcoming];
    const unique = new Map(combined.map((a) => [a.id, a]));
    const enriched = await enrichAnimeListWithAudio([...unique.values()]);
    const byId = new Map(enriched.map((a) => [a.id, a]));
    const pick = (list: IAnime[]) => list.map((a) => ({ ...a, ...(byId.get(a.id) ?? {}) }));
    popular = pick(popular);
    highestRated = pick(highestRated);
    upcoming = pick(upcoming);
  } catch {
    /* keep unenriched */
  }

  return {
    id: String(studio.id),
    name: studio.name,
    isAnimationStudio: Boolean(studio.isAnimationStudio),
    favourites: studio.favourites ?? null,
    siteUrl: studio.siteUrl ?? null,
    foundedYear,
    location: null,
    logo,
    banner,
    totalProductions: studio.media?.pageInfo?.total ?? popularNodes.length,
    averageScore,
    popular,
    highestRated,
    upcoming,
    history,
    staff: [],
  };
}
