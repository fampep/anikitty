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

export type AnimeThemePlayback = {
  key: string;
  themeId: number;
  entryId: number;
  label: string;
  version: number;
  versionLabel: string;
  episodes: string | null;
  videoUrl: string;
  songTitle: string | null;
  artists: string[];
  type: string;
  sequence: number | null;
  nc: boolean;
  lyrics: boolean;
  resolution: number;
};

export type AnimeThemesResult = {
  animeName: string;
  themes: AnimeThemeTrack[];
  /** Flattened playable rows (one per entry / version). */
  playables: AnimeThemePlayback[];
  playback: AnimeThemePlayback | null;
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

/** e.g. OP1, ED2, OP */
export function formatThemeTypeLabel(type: string, sequence: number | null): string {
  const seq = sequence != null ? String(sequence) : "";
  return `${type}${seq}`;
}

/** e.g. v1, v2 — AnimeThemes entry version */
export function formatThemeVersionLabel(version: number): string {
  return `v${version}`;
}

export function formatThemeDisplayLabel(playable: Pick<AnimeThemePlayback, "label" | "versionLabel" | "songTitle">): string {
  const base = playable.songTitle
    ? `${playable.label} · ${playable.songTitle}`
    : playable.label;
  return `${base} · ${playable.versionLabel}`;
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

function themeSortRank(t: AnimeThemeTrack): number {
  if (t.type === "OP") return t.sequence ?? 1;
  if (t.type === "ED") return 100 + (t.sequence ?? 1);
  if (t.type === "IN") return 200 + (t.sequence ?? 1);
  return 300;
}

/** One playable row per AnimeThemes entry (version). */
export function flattenThemePlayables(themes: AnimeThemeTrack[]): AnimeThemePlayback[] {
  const sorted = [...themes].sort((a, b) => themeSortRank(a) - themeSortRank(b));
  const out: AnimeThemePlayback[] = [];

  for (const theme of sorted) {
    const entries = [...theme.entries].sort((a, b) => a.version - b.version);
    for (const entry of entries) {
      const video = pickBestVideo(entry.videos);
      if (!video) continue;
      const label = formatThemeTypeLabel(theme.type, theme.sequence);
      const versionLabel = formatThemeVersionLabel(entry.version);
      out.push({
        key: `${theme.id}-${entry.id}`,
        themeId: theme.id,
        entryId: entry.id,
        label,
        version: entry.version,
        versionLabel,
        episodes: entry.episodes,
        videoUrl: video.link,
        songTitle: theme.song?.title ?? null,
        artists: theme.song?.artists ?? [],
        type: theme.type,
        sequence: theme.sequence,
        nc: video.nc,
        lyrics: video.lyrics,
        resolution: video.resolution,
      });
    }
  }

  return out;
}

function pickDefaultPlayback(playables: AnimeThemePlayback[]): AnimeThemePlayback | null {
  return playables[0] ?? null;
}

function parseAnimePayload(anime: RawAnime | null | undefined): AnimeThemesResult | null {
  if (!anime?.name) return null;
  const themes = (anime.animethemes ?? [])
    .map(normalizeTheme)
    .filter((t): t is AnimeThemeTrack => Boolean(t));

  if (!themes.length) return null;

  const playables = flattenThemePlayables(themes);

  return {
    animeName: anime.name,
    themes,
    playables,
    playback: pickDefaultPlayback(playables),
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

/** Search AnimeThemes by anime / song title. */
export async function searchAnimeThemes(query: string, limit = 12): Promise<
  { name: string; slug: string; year: number | null; anilistId: number | null }[]
> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    "page[limit]": String(Math.min(Math.max(limit, 1), 20)),
    "include[anime]": "resources",
  });

  const res = await fetch(`${API_BASE}/search?${params}`, {
    signal: AbortSignal.timeout(12_000),
    headers: FETCH_HEADERS,
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    search?: {
      anime?: {
        name?: string;
        slug?: string;
        year?: number;
        resources?: { site?: string; external_id?: number }[];
      }[];
    };
  };

  return (data.search?.anime ?? [])
    .filter((a) => a.name && a.slug)
    .map((a) => {
      const anilist = a.resources?.find((r) => r.site === "Anilist" || r.site === "AniList");
      return {
        name: a.name!,
        slug: a.slug!,
        year: a.year ?? null,
        anilistId: anilist?.external_id ?? null,
      };
    });
}
