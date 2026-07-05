import { unstable_cache } from "next/cache";
import { queryAniList } from "@/lib/oauth/anilist";
import { APP_URL } from "@/lib/seo/site-seo";

export type AnimeSeoData = {
  title: { english?: string | null; romaji?: string | null };
  description?: string | null;
  coverImage?: { extraLarge?: string | null; color?: string | null };
  bannerImage?: string | null;
  genres?: string[];
  averageScore?: number | null;
  episodes?: number | null;
  format?: string | null;
  status?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
};

const SEO_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      title { english romaji }
      description(asHtml: false)
      coverImage { extraLarge color }
      bannerImage
      genres
      averageScore
      episodes
      format
      status
      startDate { year month day }
    }
  }
`;

/** Cached AniList metadata for SEO tags + JSON-LD (shared to avoid double fetches). */
export const getAnimeSeoData = unstable_cache(
  async (id: number): Promise<AnimeSeoData | null> => {
    try {
      const data = await queryAniList<{ Media?: AnimeSeoData }>(SEO_QUERY, { id });
      return data?.Media ?? null;
    } catch {
      return null;
    }
  },
  ["anime-seo-data-v1"],
  { revalidate: 3600 },
);

function plainText(html: string | null | undefined): string {
  return (html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** Build schema.org JSON-LD (TVSeries/Movie) for an anime detail page. */
export function buildAnimeJsonLd(id: number, m: AnimeSeoData): Record<string, unknown> {
  const name = m.title.english || m.title.romaji || "Anime";
  const isMovie = (m.format ?? "").toUpperCase() === "MOVIE";
  const image = m.bannerImage || m.coverImage?.extraLarge || undefined;
  const datePublished =
    m.startDate?.year
      ? `${m.startDate.year}-${String(m.startDate.month ?? 1).padStart(2, "0")}-${String(m.startDate.day ?? 1).padStart(2, "0")}`
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name,
    alternateName: m.title.romaji && m.title.romaji !== name ? m.title.romaji : undefined,
    url: `${APP_URL.replace(/\/$/, "")}/anime/${id}`,
    description: plainText(m.description) || undefined,
    image,
    genre: m.genres?.length ? m.genres : undefined,
    ...(isMovie ? {} : { numberOfEpisodes: m.episodes ?? undefined }),
    datePublished,
  };
}
