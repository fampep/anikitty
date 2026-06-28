import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty-api";
import type { StreamTrack } from "@/lib/subtitle-track-utils";

/** Kitty API /subs providers (MegaPlay embed subtitles). */
export const KITTY_SUB_PROVIDERS = [
  "Anikoto",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type KittySubProvider = (typeof KITTY_SUB_PROVIDERS)[number];

export const KITTY_SUB_SOURCE_PROVIDER = "KittySubs";

type KittySubsFile = {
  url: string;
  label?: string;
  language?: string;
  format?: string;
  default?: boolean;
};

type KittySubsEpisode = {
  episode: number;
  files?: KittySubsFile[];
};

export type KittySubsResponse = {
  provider?: string;
  anilistId?: number;
  title?: string | null;
  seriesUrl?: string | null;
  audio?: string;
  subtitles?: KittySubsEpisode[];
  totalEpisodes?: number;
  totalFiles?: number;
  error?: string;
  message?: string;
};

export function buildKittySubsUrl(opts: {
  provider: KittySubProvider;
  anilistId?: number;
  episode?: number;
  audio?: "sub" | "dub";
  title?: string | null;
  seriesUrl?: string | null;
}): string {
  const params = new URLSearchParams({ provider: opts.provider });

  if (opts.anilistId != null && opts.anilistId > 0) {
    params.set("anilistId", String(opts.anilistId));
  }
  if (opts.episode != null && opts.episode > 0) {
    params.set("episode", String(opts.episode));
  }
  if (opts.audio) params.set("audio", opts.audio);
  if (opts.title?.trim()) params.set("title", opts.title.trim());
  if (opts.seriesUrl?.trim()) params.set("seriesUrl", opts.seriesUrl.trim());

  return `${getKittyApiBase()}/subs?${params.toString()}`;
}

function subsFilesToTracks(files: KittySubsFile[]): StreamTrack[] {
  return files
    .filter((f) => f.url?.trim())
    .map((f) => ({
      file: f.url.trim(),
      label: (f.label || f.language || "Unknown").trim(),
      kind: "subtitles",
      default: Boolean(f.default),
    }));
}

function pickEpisodeSubs(data: KittySubsResponse, episode: number): StreamTrack[] {
  const entries = data.subtitles;
  if (!Array.isArray(entries)) return [];

  const row = entries.find((e) => e.episode === episode);
  if (!row?.files?.length) return [];

  return subsFilesToTracks(row.files);
}

/** Fetch subtitle tracks for one episode via GET /subs (tries each subs provider). */
export async function fetchKittySubsTracks(opts: {
  anilistId: number;
  episode: number;
  audio?: "sub" | "dub";
  title?: string | null;
  providers?: readonly KittySubProvider[];
}): Promise<{
  tracks: StreamTrack[];
  provider: KittySubProvider;
  animeTitle: string | null;
} | null> {
  if (opts.anilistId <= 0 || opts.episode <= 0) return null;

  const audio = opts.audio ?? "sub";
  const order = opts.providers ?? KITTY_SUB_PROVIDERS;

  for (const provider of order) {
    try {
      const url = buildKittySubsUrl({
        provider,
        anilistId: opts.anilistId,
        episode: opts.episode,
        audio,
        title: opts.title,
      });

      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(35_000),
        headers: kittyApiHeaders(),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as KittySubsResponse;
      const tracks = pickEpisodeSubs(data, opts.episode);
      if (tracks.length === 0) continue;

      return {
        tracks,
        provider,
        animeTitle: data.title?.trim() || opts.title?.trim() || null,
      };
    } catch {
      // try next provider
    }
  }

  return null;
}

export async function listKittySubsProviders(): Promise<string[]> {
  try {
    const res = await fetch(`${getKittyApiBase()}/subs?list=providers`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: kittyApiHeaders(),
    });
    if (!res.ok) return [...KITTY_SUB_PROVIDERS];
    const data = await res.json();
    if (Array.isArray(data)) return data.map(String);
    if (Array.isArray(data.providers)) return data.providers.map(String);
    return [...KITTY_SUB_PROVIDERS];
  } catch {
    return [...KITTY_SUB_PROVIDERS];
  }
}
