import "server-only";

import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import type {
  HhBrowsePage,
  HhEpisode,
  HhPartialSeries,
  HhSeries,
} from "@/lib/hentaihaven/config";
import { queryAniList, toTitle } from "@/lib/oauth/anilist";

const PER_PAGE = 24;

const BROWSE_QUERY = `
  query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(
        type: ANIME
        isAdult: true
        search: $search
        sort: $sort
      ) {
        id
        title { english romaji native }
        coverImage { extraLarge large }
        description(asHtml: false)
        episodes
        averageScore
        genres
        seasonYear
        startDate { year }
        studios { nodes { name isAnimationStudio } }
        nextAiringEpisode { episode airingAt }
        status
      }
    }
  }
`;

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { english romaji native }
      coverImage { extraLarge large }
      description(asHtml: false)
      episodes
      averageScore
      genres
      seasonYear
      startDate { year }
      studios { nodes { name isAnimationStudio } }
      nextAiringEpisode { episode airingAt }
      status
      isAdult
    }
  }
`;

type AniMedia = {
  id?: number;
  title?: { english?: string | null; romaji?: string | null; native?: string | null };
  coverImage?: { extraLarge?: string | null; large?: string | null };
  description?: string | null;
  episodes?: number | null;
  averageScore?: number | null;
  genres?: string[] | null;
  seasonYear?: number | null;
  startDate?: { year?: number | null } | null;
  studios?: { nodes?: { name?: string; isAnimationStudio?: boolean }[] } | null;
  nextAiringEpisode?: { episode?: number | null; airingAt?: number | null } | null;
  status?: string | null;
  isAdult?: boolean | null;
};

function slugify(title: string, id: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "title"}-${id}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function mapPartial(m: AniMedia): HhPartialSeries | null {
  const id = Number(m.id ?? 0);
  if (!id) return null;
  const title = toTitle(m.title ?? {});
  return {
    id,
    slug: slugify(title, id),
    title,
    poster: String(m.coverImage?.extraLarge || m.coverImage?.large || "").trim(),
  };
}

function buildEpisodes(m: AniMedia): HhEpisode[] {
  const count = Math.max(
    1,
    airedCountFromAnilist(m.nextAiringEpisode, {
      status: m.status,
      episodes: m.episodes,
    }) || Number(m.episodes) || 1,
  );
  const poster = String(m.coverImage?.extraLarge || m.coverImage?.large || "").trim() || null;
  const out: HhEpisode[] = [];
  for (let n = 1; n <= count; n += 1) {
    out.push({
      id: n,
      number: n,
      slug: `episode-${n}`,
      title: `Episode ${n}`,
      poster,
    });
  }
  return out;
}

function mapSeries(m: AniMedia): HhSeries | null {
  const partial = mapPartial(m);
  if (!partial) return null;
  const studios = (m.studios?.nodes ?? [])
    .filter((s) => s?.isAnimationStudio !== false && s?.name)
    .map((s) => String(s.name));
  return {
    ...partial,
    synopsis: stripHtml(String(m.description || "")),
    alternativeTitle: m.title?.romaji || m.title?.native || null,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    score: m.averageScore != null ? m.averageScore / 10 : null,
    votes: null,
    views: null,
    genres: m.genres ?? [],
    authors: studios,
    episodes: buildEpisodes(m),
  };
}

async function pageAdult(
  page: number,
  search?: string,
): Promise<HhBrowsePage> {
  const clean = (search || "").trim();
  const raw = await queryAniList<{
    Page?: {
      pageInfo?: {
        total?: number;
        currentPage?: number;
        lastPage?: number;
      };
      media?: AniMedia[];
    };
  }>(BROWSE_QUERY, {
    page: Math.max(1, page),
    perPage: PER_PAGE,
    search: clean || undefined,
    sort: clean ? ["SEARCH_MATCH"] : ["POPULARITY_DESC"],
  });

  const items = (raw.Page?.media ?? [])
    .map(mapPartial)
    .filter((x): x is HhPartialSeries => Boolean(x));
  const pageInfo = raw.Page?.pageInfo ?? {};
  return {
    items,
    page: pageInfo.currentPage ?? page,
    totalPages: Math.max(1, pageInfo.lastPage ?? 1),
    totalResults: pageInfo.total ?? items.length,
  };
}

/** Adult catalog from AniList (`isAdult: true`) — not HentaiHaven. */
export async function browseHhSeries(page = 1): Promise<HhBrowsePage> {
  return pageAdult(page);
}

export async function searchHhSeries(query: string): Promise<HhBrowsePage> {
  const q = query.trim();
  if (!q) return browseHhSeries(1);
  return pageAdult(1, q);
}

export async function getHhSeriesById(id: number): Promise<HhSeries | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const raw = await queryAniList<{ Media?: AniMedia | null }>(DETAIL_QUERY, { id });
  const media = raw.Media;
  if (!media?.id || media.isAdult === false) return null;
  return mapSeries(media);
}

export async function getHhSeriesBySlug(slug: string): Promise<HhSeries | null> {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const idMatch = /-(\d+)$/.exec(clean);
  if (idMatch) {
    const byId = await getHhSeriesById(Number(idMatch[1]));
    if (byId) return byId;
  }
  const found = await searchHhSeries(clean.replace(/-/g, " ").replace(/\d+$/, "").trim());
  const match =
    found.items.find((i) => i.slug === clean) ??
    found.items.find((i) => clean.endsWith(String(i.id))) ??
    found.items[0];
  if (!match) return null;
  return getHhSeriesById(match.id);
}

export async function getHhHomeSpotlight(): Promise<HhPartialSeries[]> {
  const page = await browseHhSeries(1);
  return page.items.slice(0, 12);
}
