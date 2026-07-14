import { kittyApiFetch, kittyApiHeaders, kittyApiPath } from "@/lib/kitty/kitty-api-server";
import { anilistSiteSeriesUrl, isAnilistSiteProvider } from "@/lib/kitty/anilist-site-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import { dedupeSubtitleTracks } from "@/lib/subtitles/subtitle-track-utils";
import { KITTY_SUB_PROVIDERS_FALLBACK, KITTY_SUB_SOURCE_PROVIDER } from "@/lib/kitty/kitty-subs-config";

export * from "@/lib/kitty/kitty-subs-config";

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

export function buildKittySubsPath(opts: {
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

  return `/subs?${params.toString()}`;
}

export function buildKittySubsUrl(opts: {
  provider: string;
  anilistId?: number;
  episode?: number;
  audio?: "sub" | "dub";
  title?: string | null;
  seriesUrl?: string | null;
}): string {
  return kittyApiPath(buildKittySubsPath(opts));
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

export function tracksFromSubsEpisode(row: KittySubsEpisode): StreamTrack[] {
  if (!row.files?.length) return [];
  return subsFilesToTracks(row.files);
}

function pickEpisodeSubs(data: KittySubsResponse, episode: number): StreamTrack[] {
  const entries = data.subtitles;
  if (!Array.isArray(entries)) return [];

  const row = entries.find((e) => e.episode === episode);
  if (!row?.files?.length) return [];

  return subsFilesToTracks(row.files);
}

function normalizeSubsEpisodes(data: KittySubsResponse): KittySubsEpisode[] {
  if (!Array.isArray(data.subtitles)) return [];
  return data.subtitles.filter((row) => row.episode > 0 && (row.files?.length ?? 0) > 0);
}

async function fetchKittySubsResponse(opts: {
  provider: string;
  anilistId?: number;
  episode?: number;
  audio?: "sub" | "dub";
  title?: string | null;
  seriesUrl?: string | null;
}): Promise<KittySubsResponse | null> {
  try {
    const path = buildKittySubsPath({
      provider: opts.provider,
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
      title: opts.title,
      seriesUrl: opts.seriesUrl,
    });

    const res = await kittyApiFetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(opts.episode ? 35_000 : 120_000),
      headers: kittyApiHeaders(),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as KittySubsResponse;
    if (data.error) return null;

    if (opts.episode != null && opts.episode > 0) {
      if (pickEpisodeSubs(data, opts.episode).length > 0) return data;
    }

    if (normalizeSubsEpisodes(data).length > 0) return data;

    return null;
  } catch {
    return null;
  }
}

async function fetchKittySubsFromProvider(opts: {
  provider: string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<{ tracks: StreamTrack[]; animeTitle: string | null } | null> {
  const data = await fetchKittySubsResponse({
    provider: opts.provider,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
    seriesUrl: isAnilistSiteProvider(opts.provider)
      ? anilistSiteSeriesUrl(opts.anilistId)
      : undefined,
  });
  if (!data) return null;

  const tracks = pickEpisodeSubs(data, opts.episode);
  if (tracks.length === 0) return null;

  return {
    tracks: dedupeSubtitleTracks(tracks),
    animeTitle: data.title?.trim() || opts.title?.trim() || null,
  };
}

export async function listKittySubsProviders(): Promise<string[]> {
  try {
    const res = await kittyApiFetch("/subs?list=providers", {
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

/** In-memory provider count only — no Kitty API call (for read-only library routes). */
export function getCachedSubsProviderCount(): number | null {
  if (
    !subsProviderOrderCache ||
    Date.now() - subsProviderOrderCache.at >= SUBS_PROVIDER_LIST_TTL_MS
  ) {
    return null;
  }
  return subsProviderOrderCache.providers.length;
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

function prioritizeProviderOrder(
  order: string[],
  preferProvider?: string | null,
): string[] {
  const prefer = preferProvider?.trim();
  if (!prefer) return order;
  return [prefer, ...order.filter((p) => p !== prefer)];
}

/** Fetch subtitle tracks for one episode via GET /subs (first provider with tracks). */
export async function fetchKittySubsTracks(opts: {
  anilistId: number;
  episode: number;
  audio?: "sub" | "dub";
  title?: string | null;
  providers?: readonly string[];
  /** Try this provider first (e.g. the active stream provider). */
  preferProvider?: string | null;
}): Promise<{
  tracks: StreamTrack[];
  provider: string;
  animeTitle: string | null;
} | null> {
  if (opts.anilistId <= 0 || opts.episode <= 0) return null;

  const baseOrder = await getKittySubsProviderOrder(opts.providers);
  const order = prioritizeProviderOrder(baseOrder, opts.preferProvider);
  const audioModes: ("sub" | "dub")[] =
    opts.audio === "dub" ? ["dub", "sub"] : [opts.audio ?? "sub"];

  let animeTitle = opts.title?.trim() || null;

  for (const audio of audioModes) {
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
  }

  return null;
}

/** Fetch subtitles for all episodes in one Kitty `/subs` call (omit `episode`). */
export async function fetchKittySubsBulk(opts: {
  anilistId: number;
  audio?: "sub" | "dub";
  title?: string | null;
  providers?: readonly string[];
  preferProvider?: string | null;
}): Promise<{
  response: KittySubsResponse;
  provider: string;
  episodes: KittySubsEpisode[];
  animeTitle: string | null;
} | null> {
  if (opts.anilistId <= 0) return null;

  const baseOrder = await getKittySubsProviderOrder(opts.providers);
  const order = prioritizeProviderOrder(baseOrder, opts.preferProvider);
  const audioModes: ("sub" | "dub")[] =
    opts.audio === "dub" ? ["dub", "sub"] : [opts.audio ?? "sub"];

  let animeTitle = opts.title?.trim() || null;

  for (const audio of audioModes) {
    for (const provider of order) {
      const data = await fetchKittySubsResponse({
        provider,
        anilistId: opts.anilistId,
        audio,
        title: opts.title,
        seriesUrl: isAnilistSiteProvider(provider)
          ? anilistSiteSeriesUrl(opts.anilistId)
          : undefined,
      });
      if (!data) continue;

      const episodes = normalizeSubsEpisodes(data);
      if (episodes.length === 0) continue;

      if (data.title?.trim()) animeTitle = data.title.trim();

      return {
        response: data,
        provider: data.provider?.trim() || provider,
        episodes,
        animeTitle,
      };
    }
  }

  return null;
}
