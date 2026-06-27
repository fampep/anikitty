import type { StreamTrack } from "@/lib/subtitle-track-utils";
import { isSubtitleTrack } from "@/lib/subtitle-track-utils";

const KITTY_API_BASE = process.env.KITTY_API_BASE ?? "https://kittyapi.buzz";
const MIRURO_API_BASE = `${KITTY_API_BASE.replace(/\/$/, "")}/miruro`;

/** Native providers with external WebVTT subtitles (`sub` capability). */
export const MIRURO_SUB_PROVIDERS = ["kiwi", "bonk", "ally", "moo", "pewe"] as const;

/** Providers with soft-sub / embedded subtitle streams (`ssub` capability). */
export const MIRURO_SSUB_PROVIDERS = ["bonk", "bee", "hop"] as const;

export type MiruroStreamProvider = (typeof MIRURO_SUB_PROVIDERS)[number];

export type MiruroEpisode = {
  number: number;
  slug: string;
  title?: string | null;
  id?: string | null;
};

type MiruroApiResponse<T> = {
  success?: boolean;
  results?: T;
  error?: string;
};

export type MiruroStreamResult = {
  tracks: StreamTrack[];
  headers: Record<string, string>;
  animeTitle: string | null;
  provider: string;
  slug: string;
};

const episodeListCache = new Map<number, { episodes: MiruroEpisode[]; at: number }>();
const EPISODE_LIST_TTL_MS = 5 * 60_000;

function miruroHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
}

async function miruroFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<T | null> {
  const url = new URL(`${MIRURO_API_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: miruroHeaders(),
    });

    const json = (await res.json()) as MiruroApiResponse<T> | T;
    if (!res.ok) return null;

    if (json && typeof json === "object" && "success" in json) {
      const wrapped = json as MiruroApiResponse<T>;
      if (wrapped.success === false) return null;
      return (wrapped.results ?? null) as T | null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function parseEpisodeNumber(raw: unknown): number | null {
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  }
  return null;
}

function parseEpisodeSlug(raw: unknown, episodeNumber: number): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return String(episodeNumber);
}

function normalizeEpisodeList(data: unknown): MiruroEpisode[] {
  if (!data) return [];

  const list = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null
      ? ((data as { episodes?: unknown[]; results?: unknown[] }).episodes ??
        (data as { results?: unknown[] }).results ??
        [])
      : [];

  const out: MiruroEpisode[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const number =
      parseEpisodeNumber(row.number) ??
      parseEpisodeNumber(row.episode) ??
      parseEpisodeNumber(row.episodeNumber) ??
      parseEpisodeNumber(row.episode_number);

    if (!number) continue;

    out.push({
      number,
      slug: parseEpisodeSlug(row.slug ?? row.episodeSlug ?? row.id, number),
      title: typeof row.title === "string" ? row.title : null,
      id: typeof row.id === "string" ? row.id : null,
    });
  }

  return out.sort((a, b) => a.number - b.number);
}

export async function getMiruroEpisodes(anilistId: number): Promise<MiruroEpisode[]> {
  const cached = episodeListCache.get(anilistId);
  if (cached && Date.now() - cached.at < EPISODE_LIST_TTL_MS) {
    return cached.episodes;
  }

  const data = await miruroFetch<unknown>(`/episodes/${anilistId}`);
  const episodes = normalizeEpisodeList(data);
  if (episodes.length > 0) {
    episodeListCache.set(anilistId, { episodes, at: Date.now() });
  }
  return episodes;
}

export async function resolveMiruroEpisodeSlug(
  anilistId: number,
  episode: number,
): Promise<string | null> {
  const episodes = await getMiruroEpisodes(anilistId);
  const match = episodes.find((row) => row.number === episode);
  if (match?.slug) return match.slug;
  return episodes.length > 0 ? String(episode) : null;
}

function normalizeSubtitleTracks(raw: unknown): StreamTrack[] {
  if (!Array.isArray(raw)) return [];

  const tracks: StreamTrack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const file =
      (typeof row.file === "string" && row.file) ||
      (typeof row.url === "string" && row.url) ||
      (typeof row.src === "string" && row.src) ||
      (typeof row.uri === "string" && row.uri) ||
      null;

    if (!file?.trim()) continue;

    tracks.push({
      file: file.trim(),
      label:
        (typeof row.label === "string" && row.label) ||
        (typeof row.name === "string" && row.name) ||
        (typeof row.language === "string" && row.language) ||
        "Unknown",
      kind: (typeof row.kind === "string" && row.kind) || "subtitles",
      default: Boolean(row.default),
    });
  }

  return tracks.filter(isSubtitleTrack);
}

function providersForCategory(category: "sub" | "ssub"): readonly string[] {
  return category === "ssub"
    ? [...MIRURO_SSUB_PROVIDERS, ...MIRURO_SUB_PROVIDERS]
    : MIRURO_SUB_PROVIDERS;
}

/** Fetch subtitle tracks via GET /miruro/stream (slug + provider + category). */
export async function fetchMiruroSubtitleStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  slug?: string | null;
}): Promise<MiruroStreamResult | null> {
  const slug = opts.slug ?? (await resolveMiruroEpisodeSlug(opts.anilistId, opts.episode));
  if (!slug) return null;

  const categories: Array<"sub" | "ssub"> =
    opts.audio === "dub" ? ["ssub", "sub"] : ["sub"];

  for (const category of categories) {
    for (const provider of providersForCategory(category)) {
      const data = await miruroFetch<Record<string, unknown>>("/stream", {
        provider,
        anilistId: opts.anilistId,
        category,
        slug,
        quality: "1080p",
      });

      if (!data) continue;

      const rawSubs = data.subtitles ?? data.tracks ?? data.subtitleTracks;
      const tracks = normalizeSubtitleTracks(rawSubs);
      if (tracks.length === 0) continue;

      const animeTitle =
        (typeof data.title === "string" && data.title) ||
        (typeof data.animeTitle === "string" && data.animeTitle) ||
        (typeof data.matchedTitle === "string" && data.matchedTitle) ||
        null;

      const headers =
        data.headers && typeof data.headers === "object"
          ? (data.headers as Record<string, string>)
          : {};

      return {
        tracks,
        headers,
        animeTitle,
        provider,
        slug,
      };
    }
  }

  return null;
}

export function clearMiruroEpisodeCache(anilistId?: number): void {
  if (anilistId != null) episodeListCache.delete(anilistId);
  else episodeListCache.clear();
}
