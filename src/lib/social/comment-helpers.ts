// Shared helpers for the comment API: gif-url validation and a lightweight
// in-memory rate limiter (per server instance — good enough to stop spam from
// a single client; swap for Redis if you run multiple instances).

import { normalizeGifUrl, isPlausibleGifUrl, resolveGifUrlAsync } from "@/lib/core/gif-url";

const MAX_BODY = 1000;

export function sanitizeBody(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, MAX_BODY) : "";
}

/**
 * Validates an attached GIF/image URL. Returns the cleaned URL or null.
 * Must be an absolute http(s) URL pointing at a plausible image host/extension.
 */
export function sanitizeGifUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeGifUrl(input);
  if (!normalized || !isPlausibleGifUrl(normalized)) return null;
  return normalized;
}

/** Resolve share links (Tenor/Giphy/KLIPY pages) to direct media before storing. */
export async function sanitizeAndResolveGifUrl(input: unknown): Promise<string | null> {
  const sync = sanitizeGifUrl(input);
  if (!sync) return null;
  const resolved = await resolveGifUrlAsync(sync);
  if (!isPlausibleGifUrl(resolved)) return null;
  return resolved;
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
