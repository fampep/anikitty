import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty/kitty-api";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import { dedupeSubtitleTracks } from "@/lib/subtitles/subtitle-track-utils";

/** User-facing label for cached / proxied subtitle tracks (not upstream provider names). */
export const ANIKITTY_SUBTITLE_PROXY_LABEL = "Anikitty proxy";

/** Stored in Postgres — maps to {@link ANIKITTY_SUBTITLE_PROXY_LABEL} in the UI. */
export const KITTY_SUB_SOURCE_PROVIDER = "KittySubs";

/**
 * Fallback order when GET /subs?list=providers is unavailable.
 * Matches KittyAPI subs-capable providers (MegaPlay, Miruro, AllAnime, AnimeNexus, etc.).
 */
export const KITTY_SUB_PROVIDERS_FALLBACK = [
  "AnimeNexus",
  "AnimeHub",
  "AnimeOnsen",
  "AllAnime",
  "MKissa",
  "Anikoto",
  "Animo",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
  "Animex",
  "Miruro",
  "Animetsu",
  "AniWaves",
  "Senshi",
  "Animeya",
  "Anitaku",
  "Anizen",
  "Nyanime",
  "Animeverse",
  "AniZone",
] as const;

export type KittySubProvider = (typeof KITTY_SUB_PROVIDERS_FALLBACK)[number];

/** @deprecated Use KITTY_SUB_PROVIDERS_FALLBACK */
export const KITTY_SUB_PROVIDERS = KITTY_SUB_PROVIDERS_FALLBACK;

let subsProviderOrderCache: { providers: string[]; at: number } | null = null;
const SUBS_PROVIDER_LIST_TTL_MS = 10 * 60_000;

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
  provider: string;
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
    .map((f) => {
      const language = f.language?.trim();
      const labelRaw = f.label?.trim();
      const label =
        labelRaw ||
        (language ? language.toUpperCase() : "") ||
        "Unknown";
      return {
        file: f.url.trim(),
        label,
        kind: "subtitles",
        default: Boolean(f.default),
      };
    });
}

function pickEpisodeSubs(data: KittySubsResponse, episode: number): StreamTrack[] {
  const entries = data.subtitles;
  if (!Array.isArray(entries)) return [];

  const row = entries.find((e) => e.episode === episode);
  if (!row?.files?.length) return [];

  return subsFilesToTracks(row.files);
}

async function fetchKittySubsFromProvider(opts: {
  provider: string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<{ tracks: StreamTrack[]; animeTitle: string | null } | null> {
  try {
    const url = buildKittySubsUrl({
      provider: opts.provider,
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
      title: opts.title,
    });

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
      headers: kittyApiHeaders(),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as KittySubsResponse;
    const tracks = pickEpisodeSubs(data, opts.episode);
    if (tracks.length === 0) return null;

    return {
      tracks: dedupeSubtitleTracks(tracks),
      animeTitle: data.title?.trim() || opts.title?.trim() || null,
    };
  } catch {
    return null;
  }
}

export async function listKittySubsProviders(): Promise<string[]> {
  try {
    const res = await fetch(`${getKittyApiBase()}/subs?list=providers`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: kittyApiHeaders(),
    });
    if (!res.ok) return [...KITTY_SUB_PROVIDERS_FALLBACK];
    const data = await res.json();
    if (Array.isArray(data)) return data.map(String);
    if (Array.isArray(data.providers)) return data.providers.map(String);
    return [...KITTY_SUB_PROVIDERS_FALLBACK];
  } catch {
    return [...KITTY_SUB_PROVIDERS_FALLBACK];
  }
}

/** Runtime provider order from KittyAPI, merged with static fallback. */
export async function getKittySubsProviderOrder(
  override?: readonly string[],
): Promise<string[]> {
  if (override?.length) return [...override];

  if (
    subsProviderOrderCache &&
    Date.now() - subsProviderOrderCache.at < SUBS_PROVIDER_LIST_TTL_MS
  ) {
    return subsProviderOrderCache.providers;
  }

  const fromApi = await listKittySubsProviders();
  const merged = [...new Set([...fromApi, ...KITTY_SUB_PROVIDERS_FALLBACK])];
  subsProviderOrderCache = { providers: merged, at: Date.now() };
  return merged;
}

/** Fetch subtitle tracks for one episode via GET /subs (first provider with tracks). */
export async function fetchKittySubsTracks(opts: {
  anilistId: number;
  episode: number;
  audio?: "sub" | "dub";
  title?: string | null;
  providers?: readonly string[];
}): Promise<{
  tracks: StreamTrack[];
  provider: string;
  animeTitle: string | null;
} | null> {
  if (opts.anilistId <= 0 || opts.episode <= 0) return null;

  const audio = opts.audio ?? "sub";
  const order = await getKittySubsProviderOrder(opts.providers);

  let animeTitle = opts.title?.trim() || null;

  for (const provider of order) {
    const result = await fetchKittySubsFromProvider({
      provider,
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio,
      title: opts.title,
    });
    if (!result?.tracks.length) continue;

    if (result.animeTitle) animeTitle = result.animeTitle;

    return {
      tracks: result.tracks,
      provider: KITTY_SUB_SOURCE_PROVIDER,
      animeTitle,
    };
  }

  return null;
}
