const MAX_GIF_LEN = 2000;

/** Normalize common share links (KLIPY, Giphy, Imgur, etc.) to direct media URLs. */
export function normalizeGifUrl(input: string): string | null {
  const trimmed = input.trim().slice(0, MAX_GIF_LEN);
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (host.includes("giphy.com")) {
    // Preserve direct media renditions (incl. numbered CDN hosts like
    // media3.giphy.com) so lighter previews/downsized variants aren't collapsed.
    if (
      host === "media.giphy.com" ||
      /^media\d+\.giphy\.com$/.test(host) ||
      host.endsWith(".media.giphy.com")
    ) {
      return url.toString();
    }
    const idMatch = path.match(/\/(?:gifs|media)\/(?:[^/]*-)?([a-zA-Z0-9]+)/);
    if (idMatch?.[1]) {
      return `https://media.giphy.com/media/${idMatch[1]}/giphy.gif`;
    }
  }

  if (host === "imgur.com" || host === "www.imgur.com") {
    const idMatch = path.match(/\/(?:a\/)?(?:gallery\/)?([a-zA-Z0-9]{5,})(?:\/|$)/);
    if (idMatch?.[1]) {
      return `https://i.imgur.com/${idMatch[1]}.gif`;
    }
  }

  if (host === "i.imgur.com" && path.toLowerCase().endsWith(".gifv")) {
    return url.toString().replace(/\.gifv(\?.*)?$/i, ".gif$1");
  }

  if (host === "media.tenor.com" || host.endsWith(".media.tenor.com")) {
    return url.toString();
  }

  if (
    host === "static.klipy.com" ||
    host === "static1.klipy.com" ||
    host === "static2.klipy.com" ||
    host.endsWith(".klipy.com")
  ) {
    return url.toString();
  }

  return url.toString();
}

export function isPlausibleGifUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const path = u.pathname.toLowerCase();
    const hostPath = `${u.hostname.toLowerCase()}${path}`;
    return (
      /\.(gif|gifv|png|jpe?g|webp|apng|mp4)$/.test(path) ||
      /(giphy|tenor|klipy|imgur|media\d*\.|\.media\.|cdn\.discord|media\.discord)/.test(hostPath)
    );
  } catch {
    return false;
  }
}

export function looksLikeDirectMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const host = u.hostname.toLowerCase();
    if (/\.(gif|webp|png|jpe?g|apng|mp4)$/.test(path)) return true;
    if (host === "media.giphy.com" || host.endsWith(".media.giphy.com")) return true;
    if (host === "media.tenor.com" || host.endsWith(".media.tenor.com")) return true;
    if (host.endsWith(".klipy.com") || host === "static.klipy.com") return true;
    if (host === "i.imgur.com") return /\.(gif|mp4)$/i.test(path);
    if (host.includes("cdn.discordapp.com") || host.includes("media.discordapp.net")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Resolve Tenor/Giphy/KLIPY page links to direct media via oEmbed when needed. */
export async function resolveGifUrlAsync(url: string): Promise<string> {
  const normalized = normalizeGifUrl(url) ?? url;
  if (looksLikeDirectMediaUrl(normalized)) return normalized;

  let host: string;
  try {
    host = new URL(normalized).hostname.toLowerCase();
  } catch {
    return normalized;
  }

  if (host.includes("tenor.com")) {
    try {
      const res = await fetch(
        `https://tenor.com/oembed?url=${encodeURIComponent(normalized)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { thumbnail_url?: string };
        if (data.thumbnail_url && isPlausibleGifUrl(data.thumbnail_url)) {
          return data.thumbnail_url;
        }
      }
    } catch {
      // fall through
    }
  }

  if (host.includes("giphy.com")) {
    try {
      const res = await fetch(
        `https://giphy.com/services/oembed?url=${encodeURIComponent(normalized)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { thumbnail_url?: string };
        if (data.thumbnail_url && isPlausibleGifUrl(data.thumbnail_url)) {
          return data.thumbnail_url;
        }
      }
    } catch {
      // fall through
    }
  }

  return normalized;
}

/** Same-origin proxy so external GIF hosts work despite CORP / hotlink rules. */
export function gifDisplayUrl(url: string | null | undefined): string {
  if (!url) return "";
  const normalized = normalizeGifUrl(url) ?? url;
  return `/api/media/gif?url=${encodeURIComponent(normalized)}`;
}

export function isGifVideoUrl(url: string): boolean {
  return /\.mp4(\?|$)/i.test(url);
}
