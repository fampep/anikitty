import { unstable_cache } from "next/cache";
import { queryAniList } from "@/lib/oauth/anilist";
import {
  getStoredAnimeDetail,
  getBatchStoredAnimeMeta,
} from "@/lib/anime/anime-metadata-store";
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

function seoFromDetailPayload(payload: unknown): AnimeSeoData | null {
  if (!payload || typeof payload !== "object") return null;
  const anime = (payload as { anime?: { info?: any; moreInfo?: any } }).anime;
  const info = anime?.info;
  const more = anime?.moreInfo;
  if (!info) return null;

  const titles = info.titles ?? {};
  const ratingStr = typeof info.stats?.rating === "string" ? info.stats.rating : "";
  const scoreMatch = ratingStr.match(/^([\d.]+)/);
  const averageScore = scoreMatch ? Math.round(Number(scoreMatch[1]) * 10) : null;

  return {
    title: {
      english: titles.english ?? null,
      romaji: titles.romaji ?? info.name ?? null,
    },
    description: typeof info.description === "string" ? info.description : null,
    coverImage: { extraLarge: info.poster || null },
    bannerImage: info.banner || null,
    genres: Array.isArray(more?.genres) ? more.genres : [],
    averageScore,
    episodes:
      typeof info.stats?.episodes?.sub === "number" ? info.stats.episodes.sub : null,
    format: info.stats?.type ?? null,
    status: more?.status ?? null,
  };
}

function seoFromFlat(flat: {
  titleEnglish: string | null;
  titleRomaji: string | null;
  title: string | null;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
}): AnimeSeoData {
  return {
    title: {
      english: flat.titleEnglish,
      romaji: flat.titleRomaji ?? flat.title,
    },
    description: flat.description,
    coverImage: { extraLarge: flat.coverImage },
    bannerImage: flat.bannerImage,
    genres: flat.genres,
    averageScore: flat.averageScore,
    episodes: flat.episodes,
    format: flat.format,
    status: flat.status,
  };
}

async function fetchAnimeSeoData(id: number): Promise<AnimeSeoData | null> {
  const stored = await getStoredAnimeDetail(id);
  if (stored && !stored.stale) {
    return seoFromDetailPayload(stored.payload) ?? seoFromFlat(stored.flat);
  }

  // Prefer flat columns even without a full detail payload (search warm).
  if (stored?.flat.coverImage || stored?.flat.title) {
    const fromFlat = seoFromFlat(stored.flat);
    if (!stored.stale) return fromFlat;
  }

  try {
    const data = await queryAniList<{ Media?: AnimeSeoData }>(SEO_QUERY, { id });
    return data?.Media ?? (stored ? seoFromFlat(stored.flat) : null);
  } catch {
    if (stored?.payload) return seoFromDetailPayload(stored.payload);
    if (stored) return seoFromFlat(stored.flat);

    // Last resort: batch flat lookup (same row, but keeps API consistent).
    const batch = await getBatchStoredAnimeMeta([id]);
    const flat = batch.get(id);
    return flat ? seoFromFlat(flat) : null;
  }
}

/** Cached AniList metadata for SEO tags + JSON-LD (shared to avoid double fetches). */
export const getAnimeSeoData = unstable_cache(
  fetchAnimeSeoData,
  ["anime-seo-data-v2-db"],
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
