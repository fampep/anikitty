import "server-only";

import { hhKittyGet } from "@/lib/hentaihaven/client";
import type {
  HhBrowsePage,
  HhEpisode,
  HhPartialSeries,
  HhSeries,
} from "@/lib/hentaihaven/config";

type KittyPartial = {
  id?: number;
  slug?: string;
  title?: string;
  poster?: string;
  url?: string;
  seriesUrl?: string;
};

type KittyBrowse = {
  items?: KittyPartial[];
  page?: number;
  totalPages?: number;
  totalResults?: number;
};

type KittyEpisode = {
  number?: number;
  title?: string;
  slug?: string;
  poster?: string | null;
  dataIds?: string;
  chapterId?: number;
};

type KittyDetails = KittyPartial & {
  synopsis?: string;
  alternativeTitle?: string | null;
  year?: number | null;
  score?: number | null;
  votes?: number | null;
  views?: number | null;
  genres?: string[];
  authors?: string[];
  episodes?: KittyEpisode[];
};

function mapPartial(row: KittyPartial): HhPartialSeries | null {
  const id = Number(row.id ?? 0);
  const slug = String(row.slug || "").trim();
  const title = String(row.title || "").trim();
  if (!id || !slug || !title) return null;
  return {
    id,
    slug,
    title,
    poster: String(row.poster || "").trim(),
  };
}

function mapEpisode(row: KittyEpisode): HhEpisode | null {
  let chapterId = Number(row.chapterId ?? 0);
  if (!chapterId && row.dataIds) {
    try {
      const meta = JSON.parse(row.dataIds) as { chapterId?: number };
      chapterId = Number(meta.chapterId ?? 0);
    } catch {
      /* ignore */
    }
  }
  const slug = String(row.slug || "").trim();
  const number = Number(row.number ?? 0);
  if (!chapterId || !slug || !number) return null;
  return {
    id: chapterId,
    number,
    slug,
    title: String(row.title || `Episode ${number}`).trim(),
    poster: row.poster ?? null,
    dataIds: row.dataIds,
  };
}

export async function browseHhSeries(page = 1): Promise<HhBrowsePage> {
  const data = await hhKittyGet<KittyBrowse>("browse", { page });
  const items = (data.items ?? [])
    .map(mapPartial)
    .filter((x): x is HhPartialSeries => Boolean(x));
  return {
    items,
    page: data.page ?? page,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? items.length,
  };
}

export async function searchHhSeries(query: string): Promise<HhBrowsePage> {
  const q = query.trim();
  if (!q) return browseHhSeries(1);
  const rows = await hhKittyGet<KittyPartial[]>("search", { q });
  const items = (Array.isArray(rows) ? rows : [])
    .map(mapPartial)
    .filter((x): x is HhPartialSeries => Boolean(x));
  return {
    items,
    page: 1,
    totalPages: 1,
    totalResults: items.length,
  };
}

export async function getHhSeriesById(id: number): Promise<HhSeries | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const data = await hhKittyGet<KittyDetails>("details", {
    seriesUrl: `hh:${id}`,
  });
  const partial = mapPartial(data);
  if (!partial) return null;
  const episodes = (data.episodes ?? [])
    .map(mapEpisode)
    .filter((x): x is HhEpisode => Boolean(x))
    .sort((a, b) => a.number - b.number);
  return {
    ...partial,
    synopsis: String(data.synopsis || "").trim(),
    alternativeTitle: data.alternativeTitle ?? null,
    year: data.year ?? null,
    score: data.score ?? null,
    votes: data.votes ?? null,
    views: data.views ?? null,
    genres: data.genres ?? [],
    authors: data.authors ?? [],
    episodes,
  };
}

export async function getHhSeriesBySlug(slug: string): Promise<HhSeries | null> {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  try {
    const data = await hhKittyGet<KittyDetails>("details", { slug: clean });
    const partial = mapPartial(data);
    if (!partial) return null;
    const episodes = (data.episodes ?? [])
      .map(mapEpisode)
      .filter((x): x is HhEpisode => Boolean(x))
      .sort((a, b) => a.number - b.number);
    return {
      ...partial,
      synopsis: String(data.synopsis || "").trim(),
      alternativeTitle: data.alternativeTitle ?? null,
      year: data.year ?? null,
      score: data.score ?? null,
      votes: data.votes ?? null,
      views: data.views ?? null,
      genres: data.genres ?? [],
      authors: data.authors ?? [],
      episodes,
    };
  } catch {
    const found = await searchHhSeries(clean.replace(/-/g, " "));
    const match = found.items.find((i) => i.slug === clean) ?? found.items[0];
    if (!match) return null;
    return getHhSeriesById(match.id);
  }
}

export async function getHhHomeSpotlight(): Promise<HhPartialSeries[]> {
  const rows = await hhKittyGet<KittyPartial[]>("home");
  return (Array.isArray(rows) ? rows : [])
    .map(mapPartial)
    .filter((x): x is HhPartialSeries => Boolean(x));
}
