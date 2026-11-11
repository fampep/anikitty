/**
 * Only allow same-origin relative paths for post-login redirects.
 * Rejects protocol-relative, backslash tricks, control chars, and encoded variants.
 *
 * Callers that already decoded the value (e.g. `URLSearchParams.get`) should pass
 * it as-is — do not double-decode.
 */
export function safeInternalNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  // Normalize backslashes that browsers treat as path separators / authority.
  value = value.replace(/\\/g, "/");

  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  // Block "/\evil" → "//evil" style and whitespace-padded authorities.
  if (/^\/[\s/\\]/.test(value)) return null;

  try {
    const base = "https://anikitty.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    if (url.username || url.password) return null;
    // Rebuild from URL parts so path stays relative and query/hash are preserved.
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) return null;
    // Reject absolute-looking schemes that somehow survived in the path/query.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path.slice(1))) return null;
    return path;
  } catch {
    return null;
  }
}

const OAUTH_NEXT_KEY = "ak_oauth_next";

/** Stash only when we have a safe path — never clear an existing stash on null. */
export function stashOAuthNextPath(next: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = safeInternalNextPath(next);
  if (!safe) return;
  sessionStorage.setItem(OAUTH_NEXT_KEY, safe);
}

export function peekStashedOAuthNextPath(): string | null {
  if (typeof window === "undefined") return null;
  return safeInternalNextPath(sessionStorage.getItem(OAUTH_NEXT_KEY));
}

export function takeStashedOAuthNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(OAUTH_NEXT_KEY);
  sessionStorage.removeItem(OAUTH_NEXT_KEY);
  return safeInternalNextPath(raw);
}

export function readCurrentNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return safeInternalNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** Prefer URL `?next=`, then OAuth stash (without clearing unless `consumeStash`). */
export function resolvePostAuthNextPath(opts?: { consumeStash?: boolean }): string | null {
  const fromQuery = readCurrentNextParam();
  if (fromQuery) return fromQuery;
  return opts?.consumeStash ? takeStashedOAuthNextPath() : peekStashedOAuthNextPath();
}
