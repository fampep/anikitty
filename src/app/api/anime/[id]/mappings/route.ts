export const revalidate = 86400;

import { fetchExternalMetadata } from "@/lib/anime/external-metadata";

const TVDB_API = "https://api4.thetvdb.com/v4";

// Module-level token cache (valid 29 days per TVDB docs)
let _token: string | null = null;
let _tokenExpiry = 0;

async function getTvdbToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const apiKey = process.env.TVDB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${TVDB_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.status !== "success") return null;
    _token = data.data.token as string;
    _tokenExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000;
    return _token;
  } catch {
    return null;
  }
}

interface RawArtwork {
  image: string;
  thumbnail?: string;
  type: number;
  score?: number;
}

async function fetchTvdbArtworks(tvdbId: number): Promise<RawArtwork[]> {
  const token = await getTvdbToken();
  if (!token) return [];

  // Try series first, fall back to movies
  for (const kind of ["series", "movies"] as const) {
    try {
      const res = await fetch(`${TVDB_API}/${kind}/${tvdbId}/artworks`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const artworks: RawArtwork[] = data?.data?.artworks ?? [];
      if (artworks.length > 0) return artworks;
    } catch {
      continue;
    }
  }
  return [];
}

// TVDB artwork type IDs
// Series: 1=banner  2=poster  3=background  14=clearart  15=clearlogo
// Movies: 22=background  23=poster  24=banner  25=clearart  26=clearlogo
const BG_TYPES      = new Set([3, 17, 22]);
const POSTER_TYPES  = new Set([2, 23]);
const BANNER_TYPES  = new Set([1, 24]);
const CLEARART_TYPES = new Set([14, 25]);
const CLEARLOGO_TYPES = new Set([15, 26]);

function byScore(a: RawArtwork, b: RawArtwork) {
  return (b.score ?? 0) - (a.score ?? 0);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ mappings: null, images: null, metadata: null });

  try {
    const res = await fetch(
      `https://api.ani.zip/mappings?anilist_id=${numId}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return Response.json({ mappings: null, images: null, metadata: null });

    const data = await res.json();
    const mappings = data.mappings ?? null;
    const aniZipImages = data.images ?? null;

    const artworks = {
      backgrounds: [] as { image: string; thumbnail?: string }[],
      posters:     [] as { image: string; thumbnail?: string }[],
      banners:     [] as { image: string; thumbnail?: string }[],
      clearArt:    [] as { image: string; thumbnail?: string }[],
      clearLogo:   [] as { image: string; thumbnail?: string }[],
    };

    if (mappings?.thetvdb_id) {
      const raw = await fetchTvdbArtworks(mappings.thetvdb_id);
      raw.sort(byScore);
      for (const art of raw) {
        const item = { image: art.image, thumbnail: art.thumbnail };
        if (BG_TYPES.has(art.type))        artworks.backgrounds.push(item);
        else if (POSTER_TYPES.has(art.type))  artworks.posters.push(item);
        else if (BANNER_TYPES.has(art.type))  artworks.banners.push(item);
        else if (CLEARART_TYPES.has(art.type)) artworks.clearArt.push(item);
        else if (CLEARLOGO_TYPES.has(art.type)) artworks.clearLogo.push(item);
      }
    }

    // AniList score for ratings row — fetched separately on detail page via main API;
    // pass null here and let client merge, OR we could add a lightweight query.
    // Client merges AniList score from anime.stats in the UI.
    const metadata = await fetchExternalMetadata({
      anilistId: numId,
      malId: mappings?.mal_id ?? null,
      tvdbId: mappings?.thetvdb_id ?? null,
      tmdbId: mappings?.themoviedb_id ?? null,
      imdbId: mappings?.imdb_id ?? null,
    });

    return Response.json({
      mappings,
      images: { ...aniZipImages, artworks },
      metadata,
    });
  } catch {
    return Response.json({ mappings: null, images: null, metadata: null });
  }
}
