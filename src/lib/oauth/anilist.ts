const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const ANILIST_TIMEOUT_MS = 20_000;
const ANILIST_MAX_ATTEMPTS = 4;
const CACHE_MAX = 800;
const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { at: number; data: unknown };

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(query: string, variables?: Record<string, unknown>): string {
  return JSON.stringify({ q: query.replace(/\s+/g, " ").trim(), v: variables ?? {} });
}

function readFreshCache(key: string): unknown | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) return null;
  return entry.data;
}

function readStaleCache(key: string): unknown | null {
  return memoryCache.get(key)?.data ?? null;
}

function writeCache(key: string, data: unknown): void {
  memoryCache.delete(key);
  memoryCache.set(key, { at: Date.now(), data });
  if (memoryCache.size > CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
}

function anilistSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(ANILIST_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

function isRetryableAniListError(message: string, status?: number): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted") ||
    lower.includes("internal") ||
    lower.includes("too many")
  );
}

function retryDelayMs(attempt: number, message: string, status?: number): number {
  if (status === 429 || message.toLowerCase().includes("rate")) {
    return 1500 * (attempt + 1);
  }
  return 500 * (attempt + 1);
}

async function fetchAniListOnce(
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "AniKitty/1.0 (+https://anikitty.moe)",
    },
    body: JSON.stringify({ query, variables }),
    signal: anilistSignal(),
    next: { revalidate: 900 },
  });

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("Invalid AniList response");

  if (json.errors?.length) {
    const message = String(json.errors[0]?.message ?? "AniList GraphQL error");
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`AniList HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return json.data;
}

async function fetchAniListWithRetries(
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < ANILIST_MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchAniListOnce(query, variables);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const status = (error as Error & { status?: number }).status;
      lastError = error;

      if (attempt < ANILIST_MAX_ATTEMPTS - 1 && isRetryableAniListError(error.message, status)) {
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt, error.message, status)));
        continue;
      }

      if (attempt < ANILIST_MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt, error.message, status)));
        continue;
      }
    }
  }

  throw lastError ?? new Error("AniList request failed");
}

export async function queryAniList<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const key = cacheKey(query, variables);

  const fresh = readFreshCache(key);
  if (fresh) return fresh as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const data = await fetchAniListWithRetries(query, variables);
      writeCache(key, data);
      return data as T;
    } catch (err) {
      const stale = readStaleCache(key);
      if (stale) {
        console.warn("[anilist] serving stale cache after error:", err);
        return stale as T;
      }
      throw err;
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export function toTitle(t: { english?: string | null; romaji?: string | null }): string {
  return t.english || t.romaji || "Unknown";
}

export function toFormat(format: string | null | undefined): string {
  if (!format) return "TV";
  const map: Record<string, string> = {
    TV: "TV",
    TV_SHORT: "TV",
    MOVIE: "Movie",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "Special",
    MUSIC: "Music",
  };
  return map[format] ?? format;
}

export function toStatus(status: string | null | undefined): string {
  const map: Record<string, string> = {
    FINISHED: "Finished Airing",
    RELEASING: "Currently Airing",
    NOT_YET_RELEASED: "Not yet aired",
    CANCELLED: "Cancelled",
    HIATUS: "On Hiatus",
  };
  return map[status ?? ""] ?? "Unknown";
}

export function formatPartialDate(d: { year?: number | null; month?: number | null; day?: number | null } | null | undefined): string {
  if (!d?.year) return "N/A";
  return new Date(d.year, (d.month ?? 1) - 1, d.day ?? 1)
    .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
