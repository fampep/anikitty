export const DEFAULT_KITTY_API_BASE = "https://kittyapi.92-119-165-226.sslip.io";

const KITTY_API_BASE = process.env.KITTY_API_BASE ?? DEFAULT_KITTY_API_BASE;

export function getKittyApiBase(): string {
  return KITTY_API_BASE.replace(/\/$/, "");
}

/** Auth headers for Kitty provider routes (Bearer + legacy x-api-key). */
export function kittyApiHeaders(): HeadersInit {
  const apiKey = process.env.KITTY_API_KEY;
  if (!apiKey) return {};
  return {
    Authorization: `Bearer ${apiKey}`,
    "x-api-key": apiKey,
  };
}

export function buildKittyStreamDirectUrl(opts: {
  provider: string;
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });

  const title = opts.title?.trim();
  if (title) params.set("title", title);

  return `${getKittyApiBase()}/provider/${encodeURIComponent(opts.provider)}/stream-direct?${params.toString()}`;
}

export function buildKittyAutoStreamUrl(opts: {
  anilistId: number | string;
  episode: number | string;
  audio: "sub" | "dub";
  title?: string | null;
}): string {
  const params = new URLSearchParams({
    q: String(opts.anilistId),
    ep: String(opts.episode),
    audio: opts.audio,
  });

  const title = opts.title?.trim();
  if (title) params.set("title", title);

  return `${getKittyApiBase()}/auto/stream?${params.toString()}`;
}
