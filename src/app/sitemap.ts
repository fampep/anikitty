import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { queryAniList } from "@/lib/oauth/anilist";
import { APP_URL } from "@/lib/seo/site-seo";
import { ROUTES } from "@/constants/routes";

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: ROUTES.HOME, priority: 1, changeFrequency: "daily" },
  { path: ROUTES.TRENDING, priority: 0.9, changeFrequency: "daily" },
  { path: ROUTES.NEW, priority: 0.9, changeFrequency: "daily" },
  { path: ROUTES.SCHEDULE, priority: 0.7, changeFrequency: "daily" },
  { path: ROUTES.SEARCH, priority: 0.6, changeFrequency: "weekly" },
  { path: ROUTES.COMMUNITY, priority: 0.6, changeFrequency: "weekly" },
  { path: ROUTES.FORUM, priority: 0.6, changeFrequency: "daily" },
  { path: ROUTES.SUBTITLES, priority: 0.5, changeFrequency: "weekly" },
  { path: ROUTES.FAQ, priority: 0.4, changeFrequency: "monthly" },
  { path: ROUTES.DONATE, priority: 0.3, changeFrequency: "monthly" },
];

const TOP_ANIME_QUERY = `
  query {
    popular: Page(page: 1, perPage: 50) {
      media(type: ANIME, sort: POPULARITY_DESC) { id }
    }
    trending: Page(page: 1, perPage: 50) {
      media(type: ANIME, sort: TRENDING_DESC) { id }
    }
    top: Page(page: 1, perPage: 50) {
      media(type: ANIME, sort: SCORE_DESC) { id }
    }
  }
`;

const getSitemapAnimeIds = unstable_cache(
  async (): Promise<number[]> => {
    try {
      const raw = await queryAniList<{
        popular?: { media: { id: number }[] };
        trending?: { media: { id: number }[] };
        top?: { media: { id: number }[] };
      }>(TOP_ANIME_QUERY);
      const ids = [
        ...(raw.popular?.media ?? []),
        ...(raw.trending?.media ?? []),
        ...(raw.top?.media ?? []),
      ].map((m) => m.id);
      return [...new Set(ids)];
    } catch {
      return [];
    }
  },
  ["sitemap-anime-ids-v1"],
  { revalidate: 86400 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = APP_URL.replace(/\/$/, "");

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const animeIds = await getSitemapAnimeIds();
  const animeEntries: MetadataRoute.Sitemap = animeIds.map((id) => ({
    url: `${base}${ROUTES.ANIME_DETAILS}/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...animeEntries];
}
