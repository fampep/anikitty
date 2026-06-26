// Shared helpers for the comment API: gif-url validation and a lightweight
// in-memory rate limiter (per server instance — good enough to stop spam from
// a single client; swap for Redis if you run multiple instances).

const MAX_BODY = 1000;
const MAX_GIF_LEN = 2000;

export function sanitizeBody(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, MAX_BODY) : "";
}

/**
 * Validates an attached GIF/image URL. Returns the cleaned URL or null.
 * Must be an absolute http(s) URL pointing at a plausible image host/extension.
 */
export function sanitizeGifUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().slice(0, MAX_GIF_LEN);
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const path = url.pathname.toLowerCase();
  const looksLikeImage =
    /\.(gif|gifv|png|jpe?g|webp|apng)$/.test(path) ||
    /(giphy|tenor|imgur|media\d*\.|\.media\.|cdn)/.test(url.hostname + url.pathname);

  return looksLikeImage ? url.toString() : null;
}

// ── Rate limiting ──────────────────────────────────────────────────────────
// key -> array of timestamps within the window
const hits = new Map<string, number[]>();

interface RateRule {
  windowMs: number;
  max: number;
}

/**
 * Returns true if the action is allowed, false if the caller is rate limited.
 * `key` should be scoped, e.g. `post:<userId>`.
 */
export function rateLimit(key: string, rule: RateRule): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (arr.length >= rule.max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export const COMMENT_RATE = { windowMs: 30_000, max: 5 } as const; // 5 / 30s
export const VOTE_RATE = { windowMs: 10_000, max: 30 } as const; // 30 / 10s

// Opportunistic cleanup so the map does not grow unbounded.
let lastSweep = Date.now();
export function maybeSweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, arr] of hits) {
    const live = arr.filter((t) => now - t < 60_000);
    if (live.length === 0) hits.delete(k);
    else hits.set(k, live);
  }
}
