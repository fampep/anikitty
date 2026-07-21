/**
 * Reject analytics / script URLs accidentally returned as "streams"
 * (e.g. Cloudflare beacon.min.js via Byse HTML scrape).
 */

const JUNK_HOST_RE =
  /cloudflareinsights\.com|google-analytics\.com|googletagmanager\.com|facebook\.net|doubleclick\.net|hotjar\.com|sentry\.io/i;

const JUNK_PATH_RE =
  /\/beacon\.min\.js(?:\?|$)|\/analytics(?:\.js)?(?:\?|$)|\/gtag\/js/i;

const STATIC_ASSET_RE =
  /\.(?:js|css|map|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|webp)(?:\?|$)/i;

const MEDIA_HINT_RE =
  /\.(?:m3u8|mp4|mkv|webm|m4v|ts)(?:\?|$)|\/(?:cdn|hls|playlist|master|stream|manifest|video|media)\b/i;

function unwrapProxyTarget(url: string): string {
  try {
    const u = new URL(url, "http://local.invalid");
    if (u.pathname === "/proxy" || u.pathname.endsWith("/proxy")) {
      const target = u.searchParams.get("url");
      if (target) return target;
    }
    // Kitty site HLS wrapper: /api/kitty/hls?t=… — can't unwrap without decrypt.
  } catch {
    /* keep */
  }
  return url;
}

/** True when a provider `file` URL looks playable (not analytics/scripts). */
export function isLikelyMediaStreamUrl(url: string | null | undefined): boolean {
  const raw = String(url || "").trim();
  if (!raw) return false;
  const target = unwrapProxyTarget(raw);
  if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) return false;

  let host = "";
  let path = target;
  try {
    const u = new URL(target, "http://local.invalid");
    host = u.hostname;
    path = `${u.pathname}${u.search}`;
  } catch {
    return false;
  }

  if (JUNK_HOST_RE.test(host) || JUNK_PATH_RE.test(path)) return false;
  if (STATIC_ASSET_RE.test(path) && !MEDIA_HINT_RE.test(path)) return false;
  return true;
}
