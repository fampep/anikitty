const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

function runtimePort() {
  return process.env.PORT?.trim() || "3000";
}

function loopbackBase(port = runtimePort()) {
  return `http://127.0.0.1:${port}`;
}

/** True when the URL is safe for bot → Next calls inside the same container. */
export function isUsableInternalApiUrl(raw) {
  if (!raw?.trim()) return false;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:") return false;
    if (!LOOPBACK_HOSTS.has(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Base URL for server-to-server calls from the same container (bot → Next API). */
export function internalApiBase() {
  const port = runtimePort();
  const explicit = process.env.INTERNAL_API_URL?.trim();

  if (explicit && isUsableInternalApiUrl(explicit)) {
    const url = new URL(explicit);
    // Normalize 0.0.0.0 / localhost to 127.0.0.1 and honor runtime PORT when unset.
    const resolvedPort = url.port || port;
    if (resolvedPort !== port) {
      return loopbackBase(port);
    }
    return `http://127.0.0.1:${resolvedPort}`;
  }

  if (explicit) {
    console.warn(
      `[internal-api] ignoring INTERNAL_API_URL=${explicit} — use http://127.0.0.1:\${PORT} inside the container`,
    );
  }

  return loopbackBase(port);
}

/** Probe common local bases until /api/health responds. Returns null if none work yet. */
export async function resolveInternalApiBase({ timeoutMs = 4000 } = {}) {
  const port = runtimePort();
  const candidates = [
    loopbackBase(port),
    "http://127.0.0.1:80",
    "http://127.0.0.1:3000",
    isUsableInternalApiUrl(process.env.INTERNAL_API_URL)
      ? process.env.INTERNAL_API_URL.trim().replace(/\/$/, "")
      : null,
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

  return null;
}
