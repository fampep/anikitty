import {
  ensureFullShowSubtitleCache,
  ensureMiruroSubtitleCache,
  mergeCachedSubtitleTracks,
} from "@/lib/subtitle-cache-store";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  fetchMiruroVideoStream,
  isMiruroPipeProviderId,
  type MiruroSkipTimes,
} from "@/lib/miruro-api";
import {
  isSubtitleTrack,
  stripSubtitleTracks,
  SUBTITLE_SOURCE_PROVIDER,
  type StreamTrack,
} from "@/lib/subtitle-track-utils";

const BASE = process.env.KITTY_API_BASE ?? "https://kittyapi.buzz";
const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_PIPE = /^[a-z]{2,12}$/;
const SAFE_ID = /^\d{1,10}$/;

type StreamPayload = {
  file: string;
  headers?: Record<string, string>;
  tracks?: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  miruroPipe?: string;
  download?: string | null;
  subtitleSource?: string;
  error?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";
  const provider = searchParams.get("provider") || "Miruro";
  const miruroPipeParam = searchParams.get("miruroPipe");

  if (!anilistId || !episode || !SAFE_ID.test(anilistId) || !SAFE_ID.test(episode)) {
    return Response.json({ error: "anilistId and episode are required" }, { status: 400 });
  }

  if (!["sub", "dub"].includes(audio)) {
    return Response.json({ error: "Invalid audio parameter" }, { status: 400 });
  }

  if (!SAFE_PROVIDER.test(provider)) {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  const subtitleCtx = {
    anilistId: parseInt(anilistId, 10),
    episode: parseInt(episode, 10),
    audio: audio as "sub" | "dub",
  };

  const miruroPipe =
    miruroPipeParam && SAFE_PIPE.test(miruroPipeParam) && isMiruroPipeProviderId(miruroPipeParam)
      ? miruroPipeParam
      : provider === "Miruro"
        ? DEFAULT_MIRURO_PIPE_PROVIDER
        : null;

  async function finalizeStreamResponse(data: StreamPayload) {
    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks as { file?: string; url?: string }[]) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    data.tracks = stripSubtitleTracks(data.tracks);
    const fetchedSubs = await ensureMiruroSubtitleCache(subtitleCtx);

    data.tracks = await mergeCachedSubtitleTracks(
      data.tracks,
      subtitleCtx,
      data.headers ?? {},
    );

    if (!data.tracks.some(isSubtitleTrack) && fetchedSubs.length > 0) {
      data.tracks = [...data.tracks, ...fetchedSubs];
    }

    data.subtitleSource = SUBTITLE_SOURCE_PROVIDER;

    if (subtitleCtx.episode === 1) {
      void ensureFullShowSubtitleCache(subtitleCtx.anilistId);
    }

    return Response.json(data);
  }

  if (provider === "Miruro") {
    try {
      const miruro = await fetchMiruroVideoStream({
        anilistId: subtitleCtx.anilistId,
        episode: subtitleCtx.episode,
        audio: subtitleCtx.audio,
        pipeProvider: miruroPipe,
      });

      if (miruro?.file) {
        return finalizeStreamResponse({
          file: miruro.file,
          headers: miruro.headers,
          tracks: miruro.tracks,
          skipTimes: miruro.skipTimes,
          miruroPipe: miruro.provider,
          download: miruro.download,
        });
      }
    } catch (e) {
      console.error("[kitty/stream] Miruro pipe failed:", e);
    }
  }

  const url = `${BASE}/provider/${encodeURIComponent(provider)}/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;

  const headers: HeadersInit = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

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

    return finalizeStreamResponse(data as StreamPayload);
  } catch (e: unknown) {
    const err = e as { name?: string };
    const timedOut = err?.name === "AbortError" || err?.name === "TimeoutError";
    return Response.json(
      { file: null, error: timedOut ? `${provider} timed out` : "Failed to reach provider" },
      { status: 200 },
    );
  }
}

export const maxDuration = 30;
