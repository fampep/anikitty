/**
 * DeviantArt API v1 — client credentials + browse endpoints.
 * @see https://deviantart.readme.io/reference/browse_dailydeviations
 * @see https://deviantart.readme.io/reference/browse_tags
 */

const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const DA_API = "https://www.deviantart.com/api/v1/oauth2";

export type DeviantArtImage = {
  image: string;
  thumbnail?: string;
  title?: string;
  sourceUrl?: string;
};

type DaDeviation = {
  deviationid?: string;
  url?: string;
  title?: string;
  tags?: string[];
  preview?: { src?: string };
  content?: { src?: string };
  thumbs?: Array<{ src?: string }>;
};

let _token: string | null = null;
let _tokenExpiry = 0;

async function getDeviantArtToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const clientId = process.env.DEVIANTART_CLIENT_ID?.trim();
  const clientSecret = process.env.DEVIANTART_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch(DA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.status !== "success" || !data.access_token) return null;
    _token = data.access_token as string;
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
    _tokenExpiry = Date.now() + Math.max(60, expiresIn - 120) * 1000;
    return _token;
  } catch {
    return null;
  }
}

function deviationToImage(dev: DaDeviation): DeviantArtImage | null {
  const image = dev.content?.src ?? dev.preview?.src;
  if (!image) return null;
  const thumbnail = dev.preview?.src ?? dev.thumbs?.[0]?.src ?? image;
  const sourceUrl =
    dev.url ??
    (dev.deviationid ? `https://www.deviantart.com/deviation/${dev.deviationid}` : undefined);
  return { image, thumbnail, title: dev.title, sourceUrl };
}

function matchesAnime(dev: DaDeviation, terms: string[]): boolean {
  const haystack = [
    dev.title ?? "",
    ...(dev.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return terms.some((t) => t.length >= 3 && haystack.includes(t.toLowerCase()));
}

async function daGet(path: string, params: Record<string, string>): Promise<DaDeviation[]> {
  const token = await getDeviantArtToken();
  if (!token) return [];

  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`${DA_API}${path}?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "dA-minor-version": "20240701",
      },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results ?? []) as DaDeviation[];
  } catch {
    return [];
  }
}

function uniqueImages(items: DeviantArtImage[]): DeviantArtImage[] {
  const seen = new Set<string>();
  const out: DeviantArtImage[] = [];
  for (const item of items) {
    const key = item.image.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Tag search + daily deviations filtered to this anime. */
export async function fetchDeviantArtFanart(
  titles: (string | null | undefined)[],
  limit = 20,
): Promise<DeviantArtImage[]> {
  const terms = titles
    .map((t) => (t ?? "").trim())
    .filter((t) => t.length >= 2);
  if (!terms.length) return [];

  const primaryTag = terms[0]
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  if (!primaryTag) return [];

  const [tagResults, dailyResults] = await Promise.all([
    daGet("/browse/tags", { tag: primaryTag, limit: String(Math.min(limit, 24)) }),
    daGet("/browse/dailydeviations", { limit: "50" }),
  ]);

  const images: DeviantArtImage[] = [];

  for (const dev of tagResults) {
    const img = deviationToImage(dev);
    if (img) images.push(img);
  }

  for (const dev of dailyResults) {
    if (!matchesAnime(dev, terms)) continue;
    const img = deviationToImage(dev);
    if (img) images.push(img);
  }

  return uniqueImages(images).slice(0, limit);
}
