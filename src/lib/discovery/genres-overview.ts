import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { slugToAniListGenre } from "@/lib/search/genre-filters";
import { GENRE_META, type GenreMeta } from "@/lib/discovery/genres";

export type GenreOverviewCard = GenreMeta & {
  /** Landscape art for the card background. Null when no title in the genre has one. */
  banner: string | null;
  /** Cover art for the row strip, most popular first. */
  posters: { id: string; name: string; poster: string }[];
  /** Total titles AniList reports for the genre. */
  total: number;
};

const SLUGS = Object.keys(GENRE_META);

/** Per-genre slice of the batched query. Aliased so all genres ride one request. */
function genreBlock(alias: string, index: number): string {
  return `
    ${alias}: Page(page: 1, perPage: 8) {
      pageInfo { total }
      media(type: ANIME, genre: $g${index}, sort: [POPULARITY_DESC], isAdult: $isAdult) {
        id
        title { english romaji }
        bannerImage
        coverImage { large }
      }
    }`;
}

/**
 * One request for every genre card, using GraphQL aliases. Sixteen separate
 * queries would trip AniList's rate limit; this stays a single round trip.
 */
function buildQuery(): string {
  const args = SLUGS.map((_, i) => `$g${i}: String`).join(", ");
  const blocks = SLUGS.map((slug, i) => genreBlock(`g${i}`, i)).join("\n");
  return `query (${args}, $isAdult: Boolean) {\n${blocks}\n}`;
}

type MediaNode = {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  bannerImage?: string | null;
  coverImage?: { large?: string | null };
};

type PageBlock = {
  pageInfo?: { total?: number | null };
  media?: MediaNode[] | null;
};

export async function getGenresOverview(allowAdult = false): Promise<GenreOverviewCard[]> {
  const variables: Record<string, unknown> = { isAdult: allowAdult ? undefined : false };
  SLUGS.forEach((slug, i) => {
    variables[`g${i}`] = slugToAniListGenre(slug);
  });

  const data = await queryAniList<Record<string, PageBlock>>(buildQuery(), variables);

  return SLUGS.map((slug, i) => {
    const meta = GENRE_META[slug]!;
    const block = data?.[`g${i}`];
    const media = block?.media ?? [];

    return {
      ...meta,
      // Not every popular title carries a banner — take the first that does.
      banner: media.find((m) => m.bannerImage)?.bannerImage ?? null,
      posters: media
        .filter((m) => m.coverImage?.large)
        .slice(0, 7)
        .map((m) => ({
          id: String(m.id),
          name: toTitle(m.title ?? {}),
          poster: m.coverImage!.large!,
        })),
      total: block?.pageInfo?.total ?? 0,
    };
  });
}
