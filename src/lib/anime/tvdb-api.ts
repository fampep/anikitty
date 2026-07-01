const TVDB_API = "https://api4.thetvdb.com/v4";
const TVDB_ARTWORK = "https://artworks.thetvdb.com";

let _token: string | null = null;
let _tokenExpiry = 0;

export async function getTvdbToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const apiKey = process.env.TVDB_API_KEY?.trim();
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

export function tvdbImageUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${TVDB_ARTWORK}${normalized}`;
}

type TvdbEpisodeRow = {
  id?: number;
  image?: string;
  number?: number;
  seasonNumber?: number;
};

export type TvdbEpisodeImages = {
  byId: Record<number, string>;
  byAiredOrder: Record<number, string>;
};

/** Bulk-fetch aired-order episode images for a TVDB series. */
export async function fetchTvdbEpisodeImages(
  seriesId: number,
): Promise<TvdbEpisodeImages> {
  const token = await getTvdbToken();
  const byId: Record<number, string> = {};
  const byAiredOrder: Record<number, string> = {};

  if (!token || !seriesId) return { byId, byAiredOrder };

  let page = 0;
  let airedIndex = 0;

  try {
    for (let guard = 0; guard < 40; guard++) {
      const res = await fetch(
        `${TVDB_API}/series/${seriesId}/episodes/default/eng?page=${page}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 },
        },
      );
      if (!res.ok) break;

      const json = await res.json();
      const episodes: TvdbEpisodeRow[] = json?.data?.episodes ?? [];
      if (!episodes.length) break;

      for (const ep of episodes) {
        const image = tvdbImageUrl(ep.image);
        if (!image) continue;

        if (ep.id) byId[ep.id] = image;

        // Skip season 0 specials for absolute TV numbering when possible
        if (ep.seasonNumber === 0) continue;

        airedIndex += 1;
        if (!byAiredOrder[airedIndex]) byAiredOrder[airedIndex] = image;

        if (typeof ep.number === "number" && ep.seasonNumber === 1) {
          if (!byAiredOrder[ep.number]) byAiredOrder[ep.number] = image;
        }
      }

      const next = json?.links?.next;
      if (!next) break;
      page += 1;
    }
  } catch (err) {
    console.error("[tvdb] episode images failed:", err);
  }

  return { byId, byAiredOrder };
}
