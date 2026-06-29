import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import { isSubtitleTrack } from "@/lib/subtitles/subtitle-track-utils";
import { kittyApiHeaders, getKittyApiBase } from "@/lib/kitty/kitty-api";

const MIRURO_API_BASE = `${getKittyApiBase()}/miruro`;

/** External VTT providers — bonk first (best subtitle support per Miruro pipe). */
export const MIRURO_SUB_PROVIDERS = ["bonk", "ally", "kiwi", "moo", "pewe"] as const;

/** Native Miruro pipe providers for video (iframe mirrors last). */
export const MIRURO_PIPE_PROVIDERS = [
  { id: "bonk", label: "Bonk", native: true },
  { id: "kiwi", label: "Kiwi", native: true },
  { id: "ally", label: "Ally", native: true },
  { id: "moo", label: "Moo", native: true },
  { id: "pewe", label: "Pewe", native: true },
  { id: "bee", label: "Bee", native: true },
  { id: "hop", label: "Hop", native: true },
  { id: "nun", label: "Nun", native: false },
  { id: "bun", label: "Bun", native: false },
  { id: "twin", label: "Twin", native: false },
  { id: "cog", label: "Cog", native: false },
] as const;

export type MiruroPipeProviderId = (typeof MIRURO_PIPE_PROVIDERS)[number]["id"];

export const DEFAULT_MIRURO_PIPE_PROVIDER: MiruroPipeProviderId = "bonk";

/** Auto-fallback order when no pipe provider is selected. */
export const MIRURO_VIDEO_PROVIDER_ORDER: MiruroPipeProviderId[] = [
  "bonk",
  "kiwi",
  "ally",
  "moo",
  "pewe",
  "bee",
  "hop",
];

export type MiruroSkipTimes = {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
};

export type MiruroVideoStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  animeTitle: string | null;
  provider: string;
  slug: string;
  category: "sub" | "ssub" | "dub";
  download?: string | null;
};

export type MiruroProviderInfo = {
  id: string;
  name?: string;
  visible?: boolean;
  player?: string;
  capabilities?: Record<string, boolean>;
};

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
  return kittyApiHeaders();
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

function resolveEpisodeRow(
  providerData: MiruroProviderEpisodes | undefined,
  episode: number,
  audio: "sub" | "dub",
): { row: MiruroEpisodeRow; category: "sub" | "ssub" | "dub" } | null {
  const episodes = providerData?.episodes;
  if (!episodes) return null;

  if (audio === "dub") {
    const dubRow = episodes.dub?.find((row) => row.number === episode);
    if (dubRow) return { row: dubRow, category: "dub" };
  }

  for (const category of audio === "dub" ? (["ssub", "sub"] as const) : (["sub", "ssub"] as const)) {
    const rows = episodeRowsForCategory(providerData, category);
    const found = rows.find((r) => r.number === episode);
    if (found) return { row: found, category };
  }

  if (audio === "sub") {
    const dubRow = episodes.dub?.find((row) => row.number === episode);
    if (dubRow) return { row: dubRow, category: "dub" };
  }

  return null;
}

function parseMiruroSkipTimes(raw: unknown): MiruroSkipTimes | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const parseInterval = (value: unknown): { start: number; end: number } | null => {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const startRaw = row.startTime ?? row.start ?? row.startMs;
    const endRaw = row.endTime ?? row.end ?? row.endMs;
    let start = Number(startRaw);
    let end = Number(endRaw);
    if (typeof startRaw === "number" && startRaw > 5000) start = startRaw / 1000;
    if (typeof endRaw === "number" && endRaw > 5000) end = endRaw / 5000;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return { start, end };
  };

  const obj = raw as Record<string, unknown>;
  const intro = parseInterval(obj.intro ?? obj.op ?? obj.opening);
  const outro = parseInterval(obj.outro ?? obj.ed ?? obj.ending);
  if (!intro && !outro) return undefined;
  return { ...(intro ? { intro } : {}), ...(outro ? { outro } : {}) };
}

function extractVideoUrl(data: Record<string, unknown>): { file: string; referer?: string } | null {
  const best = data.bestStream;
  if (best && typeof best === "object") {
    const row = best as Record<string, unknown>;
    const file =
      (typeof row.file === "string" && row.file) ||
      (typeof row.url === "string" && row.url) ||
      (typeof row.src === "string" && row.src) ||
      null;
    if (file?.trim()) {
      return {
        file: file.trim(),
        referer: typeof row.referer === "string" ? row.referer : undefined,
      };
    }
  }

  if (Array.isArray(data.streams)) {
    for (const item of data.streams) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const file =
        (typeof row.file === "string" && row.file) ||
        (typeof row.url === "string" && row.url) ||
        (typeof row.src === "string" && row.src) ||
        null;
      if (file?.trim()) {
        return {
          file: file.trim(),
          referer: typeof row.referer === "string" ? row.referer : undefined,
        };
      }
    }
  }

  if (typeof data.file === "string" && data.file.trim()) {
    return { file: data.file.trim() };
  }

  return null;
}

export function isMiruroPipeProviderId(value: string): value is MiruroPipeProviderId {
  return MIRURO_PIPE_PROVIDERS.some((p) => p.id === value);
}

/** Video + subtitles + skip times via GET /miruro/stream. */
export async function fetchMiruroVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  pipeProvider?: string | null;
  quality?: string;
}): Promise<MiruroVideoStreamResult | null> {
  const payload = await getMiruroEpisodesPayload(opts.anilistId);
  const providersToTry: string[] = opts.pipeProvider
    ? [opts.pipeProvider]
    : [...MIRURO_VIDEO_PROVIDER_ORDER];

  for (const provider of providersToTry) {
    if (!isMiruroPipeProviderId(provider)) continue;

    const providerData = payload?.providers?.[provider];
    const resolved = resolveEpisodeRow(providerData, opts.episode, opts.audio);
    if (!resolved) continue;

    const slug = slugFromWatchId(resolved.row.id);
    if (!slug) continue;

    const data = await miruroFetch<Record<string, unknown>>("/stream", {
      provider,
      anilistId: opts.anilistId,
      category: resolved.category,
      slug,
      quality: opts.quality ?? "1080p",
    });

    if (!data) continue;

    const video = extractVideoUrl(data);
    if (!video?.file) continue;

    const headers =
      data.headers && typeof data.headers === "object"
        ? (data.headers as Record<string, string>)
        : {};

    if (video.referer && !headers.Referer) {
      headers.Referer = video.referer;
    }

    const rawSubs = data.subtitles ?? data.tracks ?? data.subtitleTracks;
    const tracks = normalizeSubtitleTracks(rawSubs, headers);

    const animeTitle =
      (typeof data.title === "string" && data.title) ||
      (typeof data.animeTitle === "string" && data.animeTitle) ||
      (typeof data.matchedTitle === "string" && data.matchedTitle) ||
      providerData?.meta?.title ||
      payload?.mappings?.title ||
      resolved.row.title ||
      null;

    const download =
      typeof data.download === "string"
        ? data.download
        : data.download && typeof data.download === "object"
          ? ((data.download as Record<string, unknown>).url as string | undefined) ?? null
          : null;

    return {
      file: video.file,
      headers,
      tracks,
      skipTimes: parseMiruroSkipTimes(data.skipTimes ?? data.skip_times),
      animeTitle: animeTitle ?? null,
      provider,
      slug,
      category: resolved.category,
      download: download ?? null,
    };
  }

  return null;
}

/** List Miruro streaming providers from GET /miruro/providers. */
export async function getMiruroProviders(): Promise<MiruroProviderInfo[]> {
  const data = await miruroFetch<MiruroProviderInfo[] | { providers?: MiruroProviderInfo[] }>(
    "/providers",
  );
  if (!data) return [...MIRURO_PIPE_PROVIDERS.map((p) => ({ id: p.id, name: p.label }))];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.providers)) return data.providers;
  return [...MIRURO_PIPE_PROVIDERS.map((p) => ({ id: p.id, name: p.label }))];
}

/** Proxy GET /miruro/* to Kitty API (server-side). */
export async function proxyMiruroRequest(
  pathSegments: string[],
  searchParams: URLSearchParams,
): Promise<Response> {
  const path = pathSegments.filter(Boolean).join("/");
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const url = new URL(`${MIRURO_API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: miruroHeaders(),
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return Response.json({ success: false, error: "Miruro API unreachable" }, { status: 502 });
  }
}

export function clearMiruroEpisodeCache(anilistId?: number): void {
  if (anilistId != null) episodeListCache.delete(anilistId);
  else episodeListCache.clear();
}

export type MiruroPipeCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_MIRURO_CAPS: MiruroPipeCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeMiruroCaps(...items: MiruroPipeCapabilities[]): MiruroPipeCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

function miruroPipeCapabilitiesFromPayload(
  payload: MiruroEpisodesPayload,
  pipe: MiruroPipeProviderId,
  episode: number,
): MiruroPipeCapabilities {
  const episodes = payload.providers?.[pipe]?.episodes;
  if (!episodes) return EMPTY_MIRURO_CAPS;

  const hasSub = episodes.sub?.some((row) => row.number === episode) ?? false;
  const hasSsub = episodes.ssub?.some((row) => row.number === episode) ?? false;
  const hasDub = episodes.dub?.some((row) => row.number === episode) ?? false;

  return {
    sub: hasSub || hasSsub,
    dub: hasDub,
    multi: (hasSub || hasSsub) && hasDub,
    softSub: hasSsub,
    hardSub: hasSub && !hasSsub,
  };
}

/** Per-pipe sub/dub/hardsub from Miruro episode lists (one Kitty API call). */
export async function probeMiruroPipeCapabilities(
  anilistId: number,
  episode: number,
  pipeId: MiruroPipeProviderId,
): Promise<MiruroPipeCapabilities> {
  const payload = await getMiruroEpisodesPayload(anilistId);
  if (!payload?.providers) return EMPTY_MIRURO_CAPS;
  return miruroPipeCapabilitiesFromPayload(payload, pipeId, episode);
}

/** Per-pipe sub/dub/hardsub from Miruro episode lists (one Kitty API call). */
export async function probeMiruroEpisodeCapabilities(
  anilistId: number,
  episode: number,
): Promise<{
  provider: MiruroPipeCapabilities;
  pipes: Partial<Record<MiruroPipeProviderId, MiruroPipeCapabilities>>;
}> {
  const payload = await getMiruroEpisodesPayload(anilistId);
  if (!payload?.providers) {
    return { provider: EMPTY_MIRURO_CAPS, pipes: {} };
  }

  const pipes: Partial<Record<MiruroPipeProviderId, MiruroPipeCapabilities>> = {};
  let provider = EMPTY_MIRURO_CAPS;

  for (const pipe of MIRURO_PIPE_PROVIDERS) {
    const caps = miruroPipeCapabilitiesFromPayload(payload, pipe.id, episode);
    pipes[pipe.id] = caps;
    provider = mergeMiruroCaps(provider, caps);
  }

  return { provider, pipes };
}

const ANITAKU_FALLBACK_PROVIDER = "Anitaku";

/** Legacy stream-direct subtitle fetch when Miruro /stream returns no VTT tracks. */
export async function fetchAnitakuSubtitleStreamFallback(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
}): Promise<MiruroStreamResult | null> {
  const url = `${getKittyApiBase()}/provider/${encodeURIComponent(ANITAKU_FALLBACK_PROVIDER)}/stream-direct?anilistId=${opts.anilistId}&episode=${opts.episode}&audio=${opts.audio}`;

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
