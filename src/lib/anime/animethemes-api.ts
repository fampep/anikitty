export type AnimeThemeVideo = {
  id: number;
  link: string;
  filename: string;
  resolution: number;
  nc: boolean;
  lyrics: boolean;
};

export type AnimeThemeEntry = {
  id: number;
  version: number;
  episodes: string | null;
  videos: AnimeThemeVideo[];
};

export type AnimeThemeSong = {
  title: string;
  artists?: string[];
};

export type AnimeThemeTrack = {
  id: number;
  type: "OP" | "ED" | "IN" | "MV" | string;
  sequence: number | null;
  slug: string;
  song: AnimeThemeSong | null;
  entries: AnimeThemeEntry[];
};

export type AnimeThemesResult = {
  animeName: string;
  themes: AnimeThemeTrack[];
  playback: {
    label: string;
    videoUrl: string;
    songTitle: string | null;
    type: string;
  } | null;
};

type RawVideo = {
  id?: number;
  link?: string;
  filename?: string;
  resolution?: number;
  nc?: boolean;
  lyrics?: boolean;
};

type RawEntry = {
  id?: number;
  version?: number;
  episodes?: string | null;
  videos?: RawVideo[];
};

type RawTheme = {
  id?: number;
  type?: string;
  sequence?: number | null;
  slug?: string;
  song?: { title?: string; artists?: { name?: string }[] };
  animethemeentries?: RawEntry[];
};

type RawAnime = {
  name?: string;
  animethemes?: RawTheme[];
};

const API_BASE = "https://api.animethemes.moe";

/** Per https://api-docs.animethemes.moe/intro/jsonapi/ — nested includes must be explicit. */
const ANIME_INCLUDE =
  "animethemes,animethemes.animethemeentries.videos,animethemes.song,animethemes.song.artists";

const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "AniKitty/1.0 (+https://github.com/fampep/anikitty)",
};

function pickBestVideo(videos: AnimeThemeVideo[]): AnimeThemeVideo | null {
  if (!videos.length) return null;
  return [...videos].sort((a, b) => b.resolution - a.resolution)[0] ?? null;
}

function normalizeTheme(theme: RawTheme): AnimeThemeTrack | null {
  if (!theme.id || !theme.type) return null;
  const entries = (theme.animethemeentries ?? [])
    .filter((entry) => entry.id != null)
    .map((entry) => ({
      id: entry.id!,
      version: entry.version ?? 1,
      episodes: entry.episodes ?? null,
      videos: (entry.videos ?? [])
        .filter((v) => v.id && v.link)
        .map((v) => ({
          id: v.id!,
          link: v.link!,
          filename: v.filename ?? "",
          resolution: v.resolution ?? 0,
          nc: Boolean(v.nc),
          lyrics: Boolean(v.lyrics),
        })),
    }))
    .filter((entry) => entry.videos.length > 0);

  if (!entries.length) return null;

  const song = theme.song?.title
    ? {
        title: theme.song.title,
        artists: theme.song.artists?.map((a) => a.name).filter(Boolean) as string[] | undefined,
      }
    : null;

  return {
    id: theme.id,
    type: theme.type,
    sequence: theme.sequence ?? null,
    slug: theme.slug ?? theme.type,
    song,
    entries,
  };
}

function pickDefaultPlayback(themes: AnimeThemeTrack[]): AnimeThemesResult["playback"] {
  const sorted = [...themes].sort((a, b) => {
    const rank = (t: AnimeThemeTrack) => {
      if (t.type === "OP") return t.sequence ?? 1;
      if (t.type === "ED") return 100 + (t.sequence ?? 1);
      return 200;
    };
    return rank(a) - rank(b);
  });

  for (const theme of sorted) {
    for (const entry of theme.entries) {
      const video = pickBestVideo(entry.videos);
      if (!video) continue;
      const seq = theme.sequence != null ? `${theme.sequence}` : "";
      return {
        label: `${theme.type}${seq}`,
        videoUrl: video.link,
        songTitle: theme.song?.title ?? null,
        type: theme.type,
      };
    }
  }

  return null;
}

function parseAnimePayload(anime: RawAnime | null | undefined): AnimeThemesResult | null {
  if (!anime?.name) return null;
  const themes = (anime.animethemes ?? [])
    .map(normalizeTheme)
    .filter((t): t is AnimeThemeTrack => Boolean(t));

  if (!themes.length) return null;

  return {
    animeName: anime.name,
    themes,
    playback: pickDefaultPlayback(themes),
  };
}

/**
 * Fetch OP/ED themes by AniList id.
 * @see https://api-docs.animethemes.moe/intro/jsonapi/
 */
export async function fetchAnimeThemesByAnilistId(
  anilistId: number,
): Promise<AnimeThemesResult | null> {
  const params = new URLSearchParams({
    "filter[has]": "resources",
    "filter[site]": "Anilist",
    "filter[external_id]": String(anilistId),
    include: ANIME_INCLUDE,
  });

  const res = await fetch(`${API_BASE}/anime?${params}`, {
    signal: AbortSignal.timeout(12_000),
    headers: FETCH_HEADERS,
    next: { revalidate: 86_400 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    anime?: RawAnime[];
  };

  const anime = data.anime?.[0] ?? null;
  return parseAnimePayload(anime);
}
