export interface IEpisodes {
  /** Aired episodes returned in `episodes`. */
  totalEpisodes: number;
  /** Full season length when known (AniList / Anikoto / TMDB). */
  plannedTotal?: number;
  airedCount?: number;
  episodes: Episode[];
}

export interface Episode {
  title: string;
  episodeId: string;
  number: number;
  isFiller: boolean;
  image?: string | null;
  overview?: string | null;
  airDate?: string | null;
  /** Episode runtime in minutes when available. */
  runtime?: number | null;
  /** Episode vote average (0–10) when available. */
  rating?: number | null;
  seasonNumber?: number | null;
  /** @deprecated Unused — episode UI no longer sources TMDB episode numbers. */
  tmdbEpisodeNumber?: number | null;
  aired?: boolean;
}

export interface IEpisodeSource {
  headers: {
    Referer: string;
  };
  subtitles: Track[];
  intro: Intro;
  outro: Outro;
  sources: Source[];
  anilistID: number;
  malID: number;
}

export interface IEpisodeServers {
  episodeId: string;
  episodeNo: string;
  sub: {
    serverId: number;
    serverName: string;
  }[];
  dub: {
    serverId: number;
    serverName: string;
  }[];
  raw: {
    serverId: number;
    serverName: string;
  }[];
}

export interface Track {
  lang: string;
  url: string;
}

export interface Intro {
  start: number;
  end: number;
}

export interface Outro {
  start: number;
  end: number;
}

export interface Source {
  url: string;
  type: string;
}
