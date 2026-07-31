const ANILIST_ENDPOINT = "https://graphql.anilist.co";
/** Default budget for metadata/detail queries. */
const ANILIST_TIMEOUT_MS = 12_000;
/** Interactive search / typeahead — fail fast, don’t hang the UI. */
const ANILIST_SEARCH_TIMEOUT_MS = 6_000;
const ANILIST_MAX_ATTEMPTS = 3;
const ANILIST_SEARCH_MAX_ATTEMPTS = 2;
const CACHE_MAX = 800;
const CACHE_TTL_MS = 15 * 60 * 1000;
/** Shorter TTL for search-shaped queries so results stay fresh. */
const SEARCH_CACHE_TTL_MS = 90_000;

type CacheEntry = { at: number; data: unknown; ttlMs: number };

const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export type QueryAniListOptions = {
  /** Per-attempt AbortSignal timeout. */
  timeoutMs?: number;
  /** Max fetch attempts (including the first). */
  maxAttempts?: number;
  /** Cache TTL for successful responses. */
  cacheTtlMs?: number;
  /** Prefer stale cache over throwing when the network fails. Default true. */
  allowStale?: boolean;
};

function cacheKey(query: string, variables?: Record<string, unknown>): string {
  return JSON.stringify({ q: query.replace(/\s+/g, " ").trim(), v: variables ?? {} });
}

function readFreshCache(key: string): unknown | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > entry.ttlMs) return null;
  return entry.data;
}

function readStaleCache(key: string): unknown | null {
  return memoryCache.get(key)?.data ?? null;
}

function writeCache(key: string, data: unknown, ttlMs: number): void {
  memoryCache.delete(key);
  memoryCache.set(key, { at: Date.now(), data, ttlMs });
  if (memoryCache.size > CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
}

function anilistSignal(timeoutMs: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(timeoutMs);
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
    lower.includes("abort") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("internal") ||
    lower.includes("too many")
  );
}

function retryDelayMs(attempt: number, message: string, status?: number): number {
  if (status === 429 || message.toLowerCase().includes("rate")) {
    return 400 * (attempt + 1);
  }
  return 200 * (attempt + 1);
}

async function fetchAniListOnce(
  query: string,
  variables: Record<string, unknown> | undefined,
  timeoutMs: number,
): Promise<unknown> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "AniKitty/1.0 (+https://anikitty.moe)",
    },
    body: JSON.stringify({ query, variables }),
    signal: anilistSignal(timeoutMs),
    // Avoid Next Data Cache coupling with AbortSignal — we own the memory cache.
    cache: "no-store",
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
  variables: Record<string, unknown> | undefined,
  opts: Required<Pick<QueryAniListOptions, "timeoutMs" | "maxAttempts">>,
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fetchAniListOnce(query, variables, opts.timeoutMs);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const status = (error as Error & { status?: number }).status;
      lastError = error;

      const canRetry =
        attempt < opts.maxAttempts - 1 && isRetryableAniListError(error.message, status);
      if (!canRetry) break;

      await new Promise((r) => setTimeout(r, retryDelayMs(attempt, error.message, status)));
    }
  }

  throw lastError ?? new Error("AniList request failed");
}

function resolveOptions(opts?: QueryAniListOptions): Required<
  Pick<QueryAniListOptions, "timeoutMs" | "maxAttempts" | "cacheTtlMs" | "allowStale">
> {
  return {
    timeoutMs: opts?.timeoutMs ?? ANILIST_TIMEOUT_MS,
    maxAttempts: opts?.maxAttempts ?? ANILIST_MAX_ATTEMPTS,
    cacheTtlMs: opts?.cacheTtlMs ?? CACHE_TTL_MS,
    allowStale: opts?.allowStale ?? true,
  };
}

export async function queryAniList<T = any>(
  query: string,
  variables?: Record<string, any>,
  opts?: QueryAniListOptions,
): Promise<T> {
  const options = resolveOptions(opts);
  const key = cacheKey(query, variables);

  const fresh = readFreshCache(key);
  if (fresh) return fresh as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const data = await fetchAniListWithRetries(query, variables, {
        timeoutMs: options.timeoutMs,
        maxAttempts: options.maxAttempts,
      });
      writeCache(key, data, options.cacheTtlMs);
      return data as T;
    } catch (err) {
      if (options.allowStale) {
        const stale = readStaleCache(key);
        if (stale) {
          console.warn("[anilist] serving stale cache after error:", err);
          return stale as T;
        }
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

/** Fast path for typeahead / search — short timeout, few retries, short cache TTL. */
export async function queryAniListSearch<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  return queryAniList<T>(query, variables, {
    timeoutMs: ANILIST_SEARCH_TIMEOUT_MS,
    maxAttempts: ANILIST_SEARCH_MAX_ATTEMPTS,
    cacheTtlMs: SEARCH_CACHE_TTL_MS,
    allowStale: true,
  });
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
