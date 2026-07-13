export interface IEpisodes {
  totalEpisodes: number;
  /** Episodes that have actually aired (optional — derived from list when absent). */
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
  /** False when the episode is listed but not yet released. */
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
