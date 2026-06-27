import type { StreamTrack } from "@/lib/subtitle-track-utils";
import { isSubtitleTrack } from "@/lib/subtitle-track-utils";

const KITTY_API_BASE = process.env.KITTY_API_BASE ?? "https://kittyapi.buzz";
const MIRURO_API_BASE = `${KITTY_API_BASE.replace(/\/$/, "")}/miruro`;

/** External VTT providers — bonk first (best subtitle support per Miruro pipe). */
export const MIRURO_SUB_PROVIDERS = ["bonk", "ally", "kiwi", "moo", "pewe"] as const;

/** Providers with soft-sub / embedded subtitle streams (`ssub` capability). */
export const MIRURO_SSUB_PROVIDERS = ["bonk", "bee", "hop"] as const;

export type MiruroStreamProvider = (typeof MIRURO_SUB_PROVIDERS)[number];

export type MiruroEpisode = {
  number: number;
  slug: string;
  provider: string;
  title?: string | null;
  watchId?: string | null;
};

type MiruroProviderEpisodes = {
  meta?: { title?: string | null };
  episodes?: {
    sub?: MiruroEpisodeRow[];
    ssub?: MiruroEpisodeRow[];
    dub?: MiruroEpisodeRow[];
  };
};

type MiruroEpisodeRow = {
  id: string;
  number: number;
  title?: string | null;
};

type MiruroEpisodesPayload = {
  providers?: Record<string, MiruroProviderEpisodes>;
  mappings?: { title?: string | null };
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

const episodeListCache = new Map<number, { payload: MiruroEpisodesPayload; at: number }>();
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

function slugFromWatchId(watchId: string): string {
  const trimmed = watchId.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.split("/");
  return parts[parts.length - 1] || trimmed;
}

/** Kitty API returns proxied subs as `/proxy?url=...&referer=...` — unwrap to the raw VTT URL. */
function unwrapKittyProxyUrl(file: string): { url: string; referer?: string } {
  const trimmed = file.trim();
  if (!trimmed) return { url: trimmed };

  let query: string | null = null;
  if (trimmed.startsWith("/proxy?")) {
    query = trimmed.slice("/proxy?".length);
  } else {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname === "/proxy" || parsed.pathname.endsWith("/proxy")) {
        query = parsed.searchParams.toString();
      }
    } catch {
      return { url: trimmed };
    }
  }

  if (!query) return { url: trimmed };

  const params = new URLSearchParams(query);
  const target = params.get("url");
  if (!target) return { url: trimmed };

  const referer = params.get("referer");
  return {
    url: target,
    referer: referer ?? undefined,
  };
}

function episodeRowsForCategory(
  providerData: MiruroProviderEpisodes | undefined,
  category: "sub" | "ssub",
): MiruroEpisodeRow[] {
  const episodes = providerData?.episodes;
  if (!episodes) return [];
  if (category === "ssub") {
    return episodes.ssub ?? episodes.sub ?? [];
  }
  return episodes.sub ?? episodes.ssub ?? [];
}

async function getMiruroEpisodesPayload(anilistId: number): Promise<MiruroEpisodesPayload | null> {
  const cached = episodeListCache.get(anilistId);
  if (cached && Date.now() - cached.at < EPISODE_LIST_TTL_MS) {
    return cached.payload;
  }

  const data = await miruroFetch<MiruroEpisodesPayload>(`/episodes/${anilistId}`);
  if (!data?.providers) return null;

  episodeListCache.set(anilistId, { payload: data, at: Date.now() });
  return data;
}

function findProviderEpisode(
  payload: MiruroEpisodesPayload,
  provider: string,
  episode: number,
  category: "sub" | "ssub",
): MiruroEpisodeRow | null {
  const rows = episodeRowsForCategory(payload.providers?.[provider], category);
  return rows.find((row) => row.number === episode) ?? null;
}

/** Episodes from the first provider that has a sub list (for display / slug hints). */
export async function getMiruroEpisodes(anilistId: number): Promise<MiruroEpisode[]> {
  const payload = await getMiruroEpisodesPayload(anilistId);
  if (!payload?.providers) return [];

  for (const provider of MIRURO_SUB_PROVIDERS) {
    const rows = episodeRowsForCategory(payload.providers[provider], "sub");
    if (rows.length === 0) continue;

    return rows.map((row) => ({
      number: row.number,
      slug: slugFromWatchId(row.id),
      provider,
      title: row.title ?? null,
      watchId: row.id,
    }));
  }

  return [];
}

export async function resolveMiruroEpisodeSlug(
  anilistId: number,
  episode: number,
): Promise<string | null> {
  const payload = await getMiruroEpisodesPayload(anilistId);
  if (!payload?.providers) return null;

  for (const provider of MIRURO_SUB_PROVIDERS) {
    const row = findProviderEpisode(payload, provider, episode, "sub");
    if (row) return slugFromWatchId(row.id);
  }

  return null;
}

function normalizeSubtitleTracks(
  raw: unknown,
  headers?: Record<string, string>,
): StreamTrack[] {
  if (!Array.isArray(raw)) return [];

  const tracks: StreamTrack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const rawFile =
      (typeof row.file === "string" && row.file) ||
      (typeof row.url === "string" && row.url) ||
      (typeof row.src === "string" && row.src) ||
      (typeof row.uri === "string" && row.uri) ||
      null;

    if (!rawFile?.trim()) continue;

    const unwrapped = unwrapKittyProxyUrl(rawFile.trim());
    if (unwrapped.referer && headers && !headers.Referer) {
      headers.Referer = unwrapped.referer;
    }

    tracks.push({
      file: unwrapped.url,
      label:
        (typeof row.label === "string" && row.label) ||
        (typeof row.name === "string" && row.name) ||
        (typeof row.language === "string" && row.language) ||
        "Unknown",
      kind: (typeof row.kind === "string" && row.kind) || "subtitles",
      default: Boolean(row.default ?? row.isDefault),
    });
  }

  return tracks.filter(isSubtitleTrack);
}

function providersForCategory(category: "sub" | "ssub"): readonly string[] {
  return category === "ssub"
    ? [...MIRURO_SSUB_PROVIDERS, ...MIRURO_SUB_PROVIDERS]
    : MIRURO_SUB_PROVIDERS;
}

/** Fetch subtitle tracks via GET /miruro/stream (provider-specific slug + category). */
export async function fetchMiruroSubtitleStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  slug?: string | null;
}): Promise<MiruroStreamResult | null> {
  const payload = await getMiruroEpisodesPayload(opts.anilistId);

  const categories: Array<"sub" | "ssub"> =
    opts.audio === "dub" ? ["ssub", "sub"] : ["sub"];

  for (const category of categories) {
    for (const provider of providersForCategory(category)) {
      const row =
        payload != null
          ? findProviderEpisode(payload, provider, opts.episode, category)
          : null;

      const slug =
        row != null
          ? slugFromWatchId(row.id)
          : provider === MIRURO_SUB_PROVIDERS[0] && opts.slug
            ? opts.slug
            : null;

      if (!slug) continue;

      const data = await miruroFetch<Record<string, unknown>>("/stream", {
        provider,
        anilistId: opts.anilistId,
        category,
        slug,
        quality: "1080p",
      });

      if (!data) continue;

      const headers =
        data.headers && typeof data.headers === "object"
          ? (data.headers as Record<string, string>)
          : {};

      const rawSubs = data.subtitles ?? data.tracks ?? data.subtitleTracks;
      const tracks = normalizeSubtitleTracks(rawSubs, headers);
      if (tracks.length === 0) continue;

      const animeTitle =
        (typeof data.title === "string" && data.title) ||
        (typeof data.animeTitle === "string" && data.animeTitle) ||
        (typeof data.matchedTitle === "string" && data.matchedTitle) ||
        payload?.providers?.[provider]?.meta?.title ||
        payload?.mappings?.title ||
        row?.title ||
        null;

      const bestStream =
        data.bestStream && typeof data.bestStream === "object"
          ? (data.bestStream as { referer?: string })
          : null;
      if (bestStream?.referer && !headers.Referer) {
        headers.Referer = bestStream.referer;
      }

      return {
        tracks,
        headers,
        animeTitle: animeTitle ?? null,
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

const ANITAKU_FALLBACK_PROVIDER = "Anitaku";

/** Legacy stream-direct subtitle fetch when Miruro /stream returns no VTT tracks. */
export async function fetchAnitakuSubtitleStreamFallback(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
}): Promise<MiruroStreamResult | null> {
  const url = `${KITTY_API_BASE}/provider/${encodeURIComponent(ANITAKU_FALLBACK_PROVIDER)}/stream-direct?anilistId=${opts.anilistId}&episode=${opts.episode}&audio=${opts.audio}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: miruroHeaders(),
    });

    const data = await res.json();
    if (!res.ok || !data?.file) return null;

    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const headers = (data.headers ?? {}) as Record<string, string>;
    const tracks = normalizeSubtitleTracks(data.tracks, headers);
    if (tracks.length === 0 && opts.audio === "dub") {
      return fetchAnitakuSubtitleStreamFallback({ ...opts, audio: "sub" });
    }
    if (tracks.length === 0) return null;

    const animeTitle =
      (typeof data.matchedTitle === "string" && data.matchedTitle) ||
      (typeof data.animeTitle === "string" && data.animeTitle) ||
      null;

    return {
      tracks,
      headers,
      animeTitle,
      provider: ANITAKU_FALLBACK_PROVIDER,
      slug: String(opts.episode),
    };
  } catch {
    return null;
  }
}
