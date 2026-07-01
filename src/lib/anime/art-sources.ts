import { queryAniList } from "@/lib/oauth/anilist";
import { getTvdbToken } from "@/lib/anime/tvdb-api";
import { fetchFanartTvArtworks } from "@/lib/anime/fanart-tv-api";

const TVDB_API = "https://api4.thetvdb.com/v4";
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_ORIGINAL = "https://image.tmdb.org/t/p/original";
const TMDB_W500 = "https://image.tmdb.org/t/p/w500";
const JIKAN_API = "https://api.jikan.moe/v4";

export type ArtworkItem = {
  image: string;
  thumbnail?: string;
  title?: string;
  sourceUrl?: string;
};

export type ArtworkGroups = {
  backgrounds: ArtworkItem[];
  posters: ArtworkItem[];
  banners: ArtworkItem[];
  clearArt: ArtworkItem[];
  clearLogo: ArtworkItem[];
  fanart: ArtworkItem[];
};

export type BasicImages = {
  banner?: string;
  fanart?: string;
  poster?: string;
};

type RawTvdbArtwork = {
  image: string;
  thumbnail?: string;
  type: number;
  score?: number;
};

const BG_TYPES = new Set([3, 17, 22]);
const POSTER_TYPES = new Set([2, 23]);
const BANNER_TYPES = new Set([1, 24]);
const CLEARART_TYPES = new Set([14, 25]);
const CLEARLOGO_TYPES = new Set([15, 26]);

function emptyGroups(): ArtworkGroups {
  return {
    backgrounds: [],
    posters: [],
    banners: [],
    clearArt: [],
    clearLogo: [],
    fanart: [],
  };
}

function normUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function mergeGroups(target: ArtworkGroups, source: Partial<ArtworkGroups> | null | undefined) {
  if (!source) return;
  const keys = Object.keys(target) as (keyof ArtworkGroups)[];
  const seen = new Set<string>();
  for (const key of keys) {
    for (const item of target[key]) seen.add(normUrl(item.image));
  }
  for (const key of keys) {
    for (const item of source[key] ?? []) {
      if (!item?.image) continue;
      const n = normUrl(item.image);
      if (seen.has(n)) continue;
      seen.add(n);
      target[key].push(item);
    }
  }
}

function tmdbUrl(path: string | null | undefined, size: "original" | "w500" = "original"): string | null {
  if (!path || typeof path !== "string") return null;
  const base = size === "w500" ? TMDB_W500 : TMDB_ORIGINAL;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchAnilistArt(anilistId: number): Promise<ArtworkGroups> {
  const groups = emptyGroups();
  try {
    const raw = await queryAniList(
      `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          bannerImage
          coverImage { extraLarge large }
        }
      }`,
      { id: anilistId },
    );
    const m = raw.Media;
    if (!m) return groups;

    const poster = m.coverImage?.extraLarge ?? m.coverImage?.large;
    if (poster) {
      groups.posters.push({ image: poster, thumbnail: m.coverImage?.large ?? poster });
    }
    if (m.bannerImage) {
      groups.banners.push({ image: m.bannerImage, thumbnail: m.bannerImage });
      groups.backgrounds.push({ image: m.bannerImage, thumbnail: m.bannerImage });
    }
  } catch {
    /* optional */
  }
  return groups;
}

async function fetchTmdbArt(tmdbId: number | string): Promise<ArtworkGroups> {
  const groups = emptyGroups();
  const apiKey = process.env.TMDB_API_KEY?.trim();
  if (!apiKey || !tmdbId) return groups;

  try {
    const res = await fetch(
      `${TMDB_API}/tv/${encodeURIComponent(String(tmdbId))}/images?api_key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return groups;

    const data = await res.json();
    const backdrops: Array<{ file_path?: string; vote_average?: number }> = data?.backdrops ?? [];
    const posters: Array<{ file_path?: string }> = data?.posters ?? [];
    const logos: Array<{ file_path?: string }> = data?.logos ?? [];

    backdrops
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .slice(0, 24)
      .forEach((b) => {
        const image = tmdbUrl(b.file_path);
        const thumb = tmdbUrl(b.file_path, "w500");
        if (!image) return;
        groups.backgrounds.push({ image, thumbnail: thumb ?? image });
      });

    backdrops.slice(0, 8).forEach((b) => {
      const image = tmdbUrl(b.file_path);
      const thumb = tmdbUrl(b.file_path, "w500");
      if (!image) return;
      groups.banners.push({ image, thumbnail: thumb ?? image });
    });

    posters.slice(0, 20).forEach((p) => {
      const image = tmdbUrl(p.file_path);
      const thumb = tmdbUrl(p.file_path, "w500");
      if (!image) return;
      groups.posters.push({ image, thumbnail: thumb ?? image });
    });

    logos.slice(0, 12).forEach((l) => {
      const image = tmdbUrl(l.file_path);
      if (!image) return;
      groups.clearLogo.push({ image, thumbnail: image });
    });
  } catch {
    /* optional */
  }

  return groups;
}

async function fetchJikanPictures(malId: number): Promise<ArtworkGroups> {
  const groups = emptyGroups();
  try {
    const res = await fetch(`${JIKAN_API}/anime/${malId}/pictures`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return groups;

    const json = await res.json();
    const pics: Array<{ jpg?: { image_url?: string }; webp?: { image_url?: string } }> =
      json?.data ?? [];

    for (const pic of pics) {
      const image = pic.webp?.image_url ?? pic.jpg?.image_url;
      if (!image) continue;
      groups.posters.push({ image, thumbnail: pic.jpg?.image_url ?? image });
    }
  } catch {
    /* optional */
  }

  return groups;
}

async function fetchTvdbArtworks(tvdbId: number): Promise<ArtworkGroups> {
  const groups = emptyGroups();
  const token = await getTvdbToken();
  if (!token) return groups;

  let raw: RawTvdbArtwork[] = [];
  for (const kind of ["series", "movies"] as const) {
    try {
      const res = await fetch(`${TVDB_API}/${kind}/${tvdbId}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const artworks: RawTvdbArtwork[] = data?.data?.artworks ?? [];
      if (artworks.length > 0) {
        raw = artworks;
        break;
      }
    } catch {
      continue;
    }
  }

  raw.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const art of raw) {
    const item = { image: art.image, thumbnail: art.thumbnail };
    if (BG_TYPES.has(art.type)) groups.backgrounds.push(item);
    else if (POSTER_TYPES.has(art.type)) groups.posters.push(item);
    else if (BANNER_TYPES.has(art.type)) groups.banners.push(item);
    else if (CLEARART_TYPES.has(art.type)) groups.clearArt.push(item);
    else if (CLEARLOGO_TYPES.has(art.type)) groups.clearLogo.push(item);
  }

  return groups;
}

function prependUnique(
  groups: ArtworkGroups,
  key: keyof ArtworkGroups,
  items: ArtworkItem[],
) {
  const seen = new Set<string>();
  for (const k of Object.keys(groups) as (keyof ArtworkGroups)[]) {
    for (const item of groups[k]) seen.add(normUrl(item.image));
  }
  const prepend: ArtworkItem[] = [];
  for (const item of items) {
    if (!item?.image) continue;
    const n = normUrl(item.image);
    if (seen.has(n)) continue;
    seen.add(n);
    prepend.push(item);
  }
  if (prepend.length) groups[key] = [...prepend, ...groups[key]];
}

function mergeAniZipBasics(
  groups: ArtworkGroups,
  aniZipImages: BasicImages | null | undefined,
) {
  if (!aniZipImages) return;
  if (aniZipImages.fanart) {
    prependUnique(groups, "backgrounds", [{ image: aniZipImages.fanart, thumbnail: aniZipImages.fanart }]);
  }
  if (aniZipImages.banner) {
    prependUnique(groups, "banners", [{ image: aniZipImages.banner, thumbnail: aniZipImages.banner }]);
  }
  if (aniZipImages.poster) {
    prependUnique(groups, "posters", [{ image: aniZipImages.poster, thumbnail: aniZipImages.poster }]);
  }
}

function collectEpisodeArtFromAniZip(
  episodes: Record<string, unknown> | null | undefined,
  groups: ArtworkGroups,
) {
  if (!episodes) return;
  const items: ArtworkItem[] = [];
  for (const val of Object.values(episodes)) {
    const e = val as Record<string, unknown>;
    if (typeof e.image === "string" && e.image.startsWith("http")) {
      items.push({ image: e.image, thumbnail: e.image });
    }
  }
  mergeGroups(groups, { backgrounds: items.slice(0, 40) });
}

/** Merge art from AniList, ani.zip, TMDB, MAL/Jikan, fanart.tv, then TVDB as fallback. */
export async function fetchMergedArtworkSources(opts: {
  anilistId: number;
  malId?: number | null;
  tvdbId?: number | null;
  tmdbId?: number | string | null;
  aniZipImages?: BasicImages | null;
  aniZipEpisodes?: Record<string, unknown> | null;
  searchTitles?: (string | null | undefined)[];
}): Promise<{ artworks: ArtworkGroups; images: BasicImages & { artworks: ArtworkGroups } }> {
  const artworks = emptyGroups();

  const [anilist, tmdb, jikan, fanartTv, tvdb] = await Promise.all([
    fetchAnilistArt(opts.anilistId),
    opts.tmdbId ? fetchTmdbArt(opts.tmdbId) : Promise.resolve(emptyGroups()),
    opts.malId ? fetchJikanPictures(opts.malId) : Promise.resolve(emptyGroups()),
    opts.tvdbId ? fetchFanartTvArtworks(opts.tvdbId) : Promise.resolve(emptyGroups()),
    opts.tvdbId ? fetchTvdbArtworks(opts.tvdbId) : Promise.resolve(emptyGroups()),
  ]);

  mergeGroups(artworks, anilist);
  mergeAniZipBasics(artworks, opts.aniZipImages);
  collectEpisodeArtFromAniZip(opts.aniZipEpisodes, artworks);
  mergeGroups(artworks, tmdb);
  mergeGroups(artworks, jikan);
  mergeGroups(artworks, fanartTv);
  mergeGroups(artworks, tvdb);

  const images: BasicImages & { artworks: ArtworkGroups } = {
    banner:
      opts.aniZipImages?.banner ??
      fanartTv.banners[0]?.image ??
      anilist.banners[0]?.image ??
      tmdb.banners[0]?.image ??
      tvdb.banners[0]?.image,
    fanart:
      fanartTv.fanart[0]?.image ??
      opts.aniZipImages?.fanart ??
      anilist.backgrounds[0]?.image ??
      tmdb.backgrounds[0]?.image ??
      tvdb.backgrounds[0]?.image,
    poster:
      opts.aniZipImages?.poster ??
      fanartTv.posters[0]?.image ??
      anilist.posters[0]?.image ??
      tmdb.posters[0]?.image ??
      jikan.posters[0]?.image ??
      tvdb.posters[0]?.image,
    artworks,
  };

  return { artworks, images };
}
