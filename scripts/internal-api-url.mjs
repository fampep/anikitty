/** Base URL for server-to-server calls from the same container (bot → Next API). */
export function internalApiBase() {
  const port = process.env.PORT?.trim() || "3000";
  const explicit = process.env.INTERNAL_API_URL?.trim();

  if (explicit) {
    const normalized = explicit.replace(/\/$/, "");
    try {
      const url = new URL(normalized);
      const isLocal =
        url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "::1";
      // Ignore stale localhost URLs that still pin port 3000 while the app listens on PORT.
      if (isLocal && url.port && url.port !== port) {
        return `http://127.0.0.1:${port}`;
      }
    } catch {
      // fall through to explicit value
    }
    return normalized;
  }

  // Never use NEXT_PUBLIC_APP_URL here — from inside Docker that often fails (hairpin NAT).
  return `http://127.0.0.1:${port}`;
}

/** Probe common local bases until /api/health responds. */
export async function resolveInternalApiBase({ timeoutMs = 4000 } = {}) {
  const port = process.env.PORT?.trim() || "3000";
  const candidates = [
    `http://127.0.0.1:${port}`,
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/$/, ""),
    "http://127.0.0.1:80",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  const seen = new Set();
  for (const base of candidates) {
    if (seen.has(base)) continue;
    seen.add(base);

    try {
      const res = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return base;
    } catch {
      // try next candidate
    }
  }

  return internalApiBase();
}
