type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limiter (per server instance). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  return { ok: true };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitedResponse(retryAfterSec: number, message?: string) {
  return Response.json(
    { error: message ?? `Too many requests. Try again in ${retryAfterSec}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Response | null {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) return rateLimitedResponse(result.retryAfterSec);
  return null;
}
