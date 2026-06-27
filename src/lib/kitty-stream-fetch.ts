const KITTY_API_BASE = "https://kittyapi.buzz";

export type KittyRawStream = {
  file: string;
  headers: Record<string, string>;
};

export async function fetchKittyStreamRaw(
  provider: string,
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
): Promise<KittyRawStream | null> {
  const url = `${KITTY_API_BASE}/provider/${encodeURIComponent(provider)}/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;

  const headers: HeadersInit = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      headers,
    });

    const data = await res.json();
    if (!res.ok || !data?.file) return null;

    return {
      file: data.file as string,
      headers: (data.headers ?? {}) as Record<string, string>,
    };
  } catch {
    return null;
  }
}
