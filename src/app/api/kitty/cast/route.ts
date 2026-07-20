import { APP_URL } from "@/lib/seo/site-seo";
import {
  HLS_CAST_TOKEN_TTL_SEC,
  HLS_SESSION_COOKIE,
  isKittyHlsProxyPath,
  readCookie,
  remintKittyHlsAsCastProxyUrl,
  verifyHlsSessionCookieValue,
} from "@/lib/kitty/hls-proxy-token";
import {
  kittyStreamChromecastMime,
  resolveKittyStreamType,
} from "@/lib/kitty/stream-format";

export type CastRemintResponse = {
  url: string;
  contentType: string;
  expiresInSec: number;
};

function absoluteFromRequest(req: Request, pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/")
    ? pathAndQuery
    : `/${pathAndQuery}`;
  const proto = (
    req.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http")
  )
    .split(",")[0]
    .trim();
  const host = (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim();
  if (host) return `${proto}://${host}${path}`;
  try {
    return new URL(path, APP_URL).href;
  } catch {
    return `${APP_URL}${path}`;
  }
}

/**
 * Remint the current browser HLS proxy URL as a Cast-friendly absolute URL.
 * Chromecast cannot send the HttpOnly `ak_pb` session cookie, so cast playback
 * uses longer-TTL tokens that authenticate without cookies (+ CORS).
 *
 * Preserves encrypted upstream Referer / Origin / Cookie from the browser
 * token so every active provider (AniWaves, Anikoto, AniWatch, AniNeko,
 * MKissa, KickAssAnime, KuroHost) keeps host-specific auth after remint.
 */
export async function POST(req: Request) {
  // No per-IP rate limit — cast remints happen on episode/provider switches.
  const sessionId = verifyHlsSessionCookieValue(
    readCookie(req, HLS_SESSION_COOKIE),
  );
  if (!sessionId) {
    return Response.json(
      {
        error:
          "Playback session required. Start watching in the browser first, then cast.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url =
    body &&
    typeof body === "object" &&
    typeof (body as { url?: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (!url) {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  if (!isKittyHlsProxyPath(url)) {
    // Non-proxy stream (rare public HTTPS) — return absolute URL as-is.
    let absolute = url;
    if (!/^https?:\/\//i.test(url)) {
      absolute = absoluteFromRequest(req, url.startsWith("/") ? url : `/${url}`);
    }
    if (!/^https:\/\//i.test(absolute) && process.env.NODE_ENV === "production") {
      return Response.json(
        {
          error:
            "Cast requires an HTTPS media URL reachable from the Chromecast device.",
        },
        { status: 400 },
      );
    }
    const contentType = kittyStreamChromecastMime(
      resolveKittyStreamType(absolute),
    );
    const payload: CastRemintResponse = {
      url: absolute,
      contentType,
      expiresInSec: HLS_CAST_TOKEN_TTL_SEC,
    };
    return Response.json(payload);
  }

  const castPath = remintKittyHlsAsCastProxyUrl(url, sessionId);
  if (!castPath) {
    return Response.json(
      {
        error:
          "Could not mint a Cast URL (expired token?). Reload the episode and try again.",
      },
      { status: 403 },
    );
  }

  const absolute = absoluteFromRequest(req, castPath);
  if (
    !/^https:\/\//i.test(absolute) &&
    process.env.NODE_ENV === "production"
  ) {
    return Response.json(
      {
        error:
          "Cast requires HTTPS. The site must be served over HTTPS for Chromecast.",
      },
      { status: 400 },
    );
  }

  // Localhost / private hosts are unreachable from a real Cast device.
  try {
    const host = new URL(absolute).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return Response.json(
        {
          error:
            "Chromecast cannot reach localhost. Deploy or use a public HTTPS URL on the same network.",
        },
        { status: 400 },
      );
    }
  } catch {
    return Response.json({ error: "Invalid Cast media URL" }, { status: 400 });
  }

  const payload: CastRemintResponse = {
    url: absolute,
    contentType: kittyStreamChromecastMime(resolveKittyStreamType(castPath)),
    expiresInSec: HLS_CAST_TOKEN_TTL_SEC,
  };
  return Response.json(payload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
