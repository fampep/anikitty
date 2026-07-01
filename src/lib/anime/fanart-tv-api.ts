type FanartTvArtworkItem = {
  image: string;
  thumbnail?: string;
  title?: string;
  sourceUrl?: string;
};

export type FanartTvArtworkGroups = {
  backgrounds: FanartTvArtworkItem[];
  posters: FanartTvArtworkItem[];
  banners: FanartTvArtworkItem[];
  clearArt: FanartTvArtworkItem[];
  clearLogo: FanartTvArtworkItem[];
  fanart: FanartTvArtworkItem[];
};

const FANART_TV_API = "https://webservice.fanart.tv/v3";

type FanartTvImage = {
  id?: string;
  url: string;
  thumb_url?: string;
  lang?: string;
  likes?: string;
  season?: string;
};

type FanartTvShowResponse = {
  name?: string;
  thetvdb_id?: string;
  showbackground?: FanartTvImage[];
  characterart?: FanartTvImage[];
  tvbanner?: FanartTvImage[];
  seasonbanner?: FanartTvImage[];
  tvposter?: FanartTvImage[];
  seasonposter?: FanartTvImage[];
  hdclearart?: FanartTvImage[];
  clearart?: FanartTvImage[];
  hdtvlogo?: FanartTvImage[];
  clearlogo?: FanartTvImage[];
  tvthumb?: FanartTvImage[];
};

function emptyGroups(): FanartTvArtworkGroups {
  return {
    backgrounds: [],
    posters: [],
    banners: [],
    clearArt: [],
    clearLogo: [],
    fanart: [],
  };
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fanartTvSeriesUrl(tvdbId: number, name?: string | null): string {
  if (name?.trim()) {
    return `https://fanart.tv/series/${tvdbId}/${slugifyName(name)}/?section=all`;
  }
  return `https://fanart.tv/series/${tvdbId}/?section=all`;
}

function sortByLikes(images: FanartTvImage[]): FanartTvImage[] {
  return [...images].sort(
    (a, b) => parseInt(b.likes ?? "0", 10) - parseInt(a.likes ?? "0", 10),
  );
}

function mapImages(
  images: FanartTvImage[] | undefined,
  seriesUrl: string,
  label: string,
): FanartTvArtworkItem[] {
  if (!images?.length) return [];

  return sortByLikes(images).map((img) => ({
    image: img.url,
    thumbnail: img.thumb_url ?? img.url,
    title: img.season ? `${label} · S${img.season}` : label,
    sourceUrl: seriesUrl,
  }));
}

/** Fetch TV show artwork from fanart.tv (requires TVDB id + FANART_TV_API_KEY). */
export async function fetchFanartTvArtworks(tvdbId: number): Promise<FanartTvArtworkGroups> {
  const apiKey = process.env.FANART_TV_API_KEY?.trim();
  if (!apiKey || !tvdbId) return emptyGroups();

  const clientKey = process.env.FANART_TV_CLIENT_KEY?.trim();
  const params = new URLSearchParams({ api_key: apiKey });
  if (clientKey) params.set("client_key", clientKey);

  try {
    const res = await fetch(`${FANART_TV_API}/tv/${tvdbId}?${params}`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return emptyGroups();

    const data = (await res.json()) as FanartTvShowResponse;
    const seriesUrl = fanartTvSeriesUrl(tvdbId, data.name);

    const fanart = [
      ...mapImages(data.showbackground, seriesUrl, "Background"),
      ...mapImages(data.characterart, seriesUrl, "Character"),
    ];

    return {
      fanart,
      backgrounds: mapImages(data.showbackground, seriesUrl, "Background"),
      banners: [
        ...mapImages(data.tvbanner, seriesUrl, "Banner"),
        ...mapImages(data.seasonbanner, seriesUrl, "Season banner"),
      ],
      posters: [
        ...mapImages(data.tvposter, seriesUrl, "Poster"),
        ...mapImages(data.seasonposter, seriesUrl, "Season poster"),
      ],
      clearArt: [
        ...mapImages(data.hdclearart, seriesUrl, "Clear art"),
        ...mapImages(data.clearart, seriesUrl, "Clear art"),
      ],
      clearLogo: [
        ...mapImages(data.hdtvlogo, seriesUrl, "Logo"),
        ...mapImages(data.clearlogo, seriesUrl, "Logo"),
      ],
    };
  } catch {
    return emptyGroups();
  }
}
