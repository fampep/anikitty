import {
  cacheStreamSubtitleTracks,
  ensureAnitakuSubtitleCache,
  mergeCachedSubtitleTracks,
} from "@/lib/subtitle-cache-store";
import {
  stripSubtitleTracks,
  SUBTITLE_SOURCE_PROVIDER,
} from "@/lib/subtitle-track-utils";

const BASE = "https://kittyapi.buzz";
const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ID = /^\d{1,10}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode   = searchParams.get("episode");
  const audio     = searchParams.get("audio") || "sub";
  const provider  = searchParams.get("provider") || "Miruro";

  if (!anilistId || !episode || !SAFE_ID.test(anilistId) || !SAFE_ID.test(episode)) {
    return Response.json({ error: "anilistId and episode are required" }, { status: 400 });
  }

  if (!["sub", "dub"].includes(audio)) {
    return Response.json({ error: "Invalid audio parameter" }, { status: 400 });
  }

  if (!SAFE_PROVIDER.test(provider)) {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  const url = `${BASE}/provider/${encodeURIComponent(provider)}/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;

  const headers: HeadersInit = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

  const subtitleCtx = {
    anilistId: parseInt(anilistId, 10),
    episode: parseInt(episode, 10),
    audio: audio as "sub" | "dub",
  };

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers,
    });

    const data = await res.json();

    if (!res.ok || !data?.file) {
      return Response.json(
        { file: null, error: data?.message ?? data?.error ?? "Provider unavailable" },
        { status: 200 },
      );
    }

    // Ensure tracks have `file` field (API uses `file`, some older providers used `url`)
    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const animeTitle =
      typeof data.matchedTitle === "string"
        ? data.matchedTitle
        : typeof data.animeTitle === "string"
          ? data.animeTitle
          : null;

    // Subtitles are always sourced from Anitaku — other providers must not cache or expose their own tracks.
    if (provider === SUBTITLE_SOURCE_PROVIDER) {
      data.tracks = await cacheStreamSubtitleTracks(data.tracks, {
        ...subtitleCtx,
        provider: SUBTITLE_SOURCE_PROVIDER,
        animeTitle,
        headers: data.headers ?? {},
      });
    } else {
      data.tracks = stripSubtitleTracks(data.tracks);
      await ensureAnitakuSubtitleCache(subtitleCtx);
    }

    data.tracks = await mergeCachedSubtitleTracks(data.tracks, subtitleCtx);
    data.subtitleSource = SUBTITLE_SOURCE_PROVIDER;

    return Response.json(data);
  } catch (e: any) {
    const timedOut = e?.name === "AbortError" || e?.name === "TimeoutError";
    return Response.json(
      { file: null, error: timedOut ? `${provider} timed out` : "Failed to reach provider" },
      { status: 200 },
    );
  }
}

export const maxDuration = 30;
