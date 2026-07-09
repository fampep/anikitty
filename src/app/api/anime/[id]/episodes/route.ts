import { queryAniList } from "@/lib/oauth/anilist";
import {
  getEpisodeImageSourcesCached,
  getStoredEpisodeList,
  storeEpisodeList,
  type EpisodeCacheContext,
} from "@/lib/anime/episode-cache-store";
import {
  resolveEpisodeImage,
  resolveEpisodeTitle,
} from "@/lib/anime/episode-thumbnails";
import {
  fetchMalEpisodeFlags,
  isSkippableEpisode,
  type EpisodeContentFlags,
} from "@/lib/anime/episode-filler";
import {
  isEpisodeAiredByDate,
  resolveAiredEpisodeCount,
} from "@/lib/anime/episode-availability";
import type { StoredEpisodeItem } from "@/db/schema";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      status
      idMal
      nextAiringEpisode { episode }
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
`;

const MINIMAL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      status
      idMal
      nextAiringEpisode { episode }
    }
  }
`;

type EpisodeMedia = {
  episodes?: number | null;
  status?: string | null;
  idMal?: number | null;
  nextAiringEpisode?: { episode?: number | null } | null;
  streamingEpisodes?: Array<{ title: string; thumbnail?: string }>;
};

function buildBasicEpisodes(count: number): StoredEpisodeItem[] {
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1;
    return {
      title: `Episode ${num}`,
      episodeId: `ep-${num}`,
      number: num,
      isFiller: false,
      image: null,
      overview: null,
      airDate: null,
    };
  });
}

function cacheContext(m: EpisodeMedia, airedUpTo: number): EpisodeCacheContext {
  return {
    airedEpisodeCount: airedUpTo,
    isAiring: m.status === "RELEASING",
    status: m.status,
    malId: m.idMal,
  };
}

async function buildEpisodesFromSources(
  numId: number,
  m: EpisodeMedia,
  airedUpTo: number,
  ctx: EpisodeCacheContext,
) {
  const streamingEpisodes = m.streamingEpisodes ?? [];
  const { sources } = await getEpisodeImageSourcesCached(numId, streamingEpisodes, ctx);
  const malId = sources.mappings?.mal_id ?? m.idMal ?? null;

  let fillerFlags: Record<number, EpisodeContentFlags> = {};
  const stored = await getStoredEpisodeList(numId, ctx);
  if (stored?.fillerFlags && Object.keys(stored.fillerFlags).length > 0 && !stored.stale) {
    fillerFlags = stored.fillerFlags;
  } else if (malId) {
    fillerFlags = await fetchMalEpisodeFlags(malId, airedUpTo).catch(() => ({}));
  }

  const episodes = Array.from({ length: airedUpTo }, (_, i) => {
    const num = i + 1;
    const title = resolveEpisodeTitle(num, sources) ?? `Episode ${num}`;
    const zip = sources.anizip[num];
    const flags = fillerFlags[num];

    return {
      title,
      episodeId: `ep-${num}`,
      number: num,
      isFiller: isSkippableEpisode(flags),
      image: resolveEpisodeImage(num, sources),
      overview: zip?.overview ?? null,
      airDate: zip?.airDate ?? null,
    };
  }).filter((ep) => isEpisodeAiredByDate(ep.airDate));

  void storeEpisodeList(numId, {
    episodes,
    airedCount: airedUpTo,
    status: m.status,
    malId,
    sources,
    fillerFlags,
  });

  return episodes;
}

async function loadEpisodeMedia(numId: number, m: EpisodeMedia) {
  const streamingEpisodes = m.streamingEpisodes ?? [];
  const airedUpTo = resolveAiredEpisodeCount({
    status: m.status,
    episodes: m.episodes,
    nextAiringEpisode: m.nextAiringEpisode?.episode ?? null,
    streamingEpisodeCount: streamingEpisodes.length,
  });

  if (airedUpTo <= 0) {
    return { data: { totalEpisodes: 0, episodes: [] } };
  }

  const ctx = cacheContext(m, airedUpTo);

  try {
    const cached = await getStoredEpisodeList(numId, ctx);
    if (cached && !cached.stale && cached.episodes.length > 0) {
      return { data: { totalEpisodes: cached.totalEpisodes, episodes: cached.episodes } };
    }

    const episodes = await buildEpisodesFromSources(numId, m, airedUpTo, ctx);
    return { data: { totalEpisodes: episodes.length, episodes } };
  } catch (err) {
    console.error("Episode metadata enrichment failed:", err);

    const cached = await getStoredEpisodeList(numId, ctx);
    if (cached?.episodes.length) {
      return {
        data: { totalEpisodes: cached.totalEpisodes, episodes: cached.episodes },
        degraded: true,
      };
    }

    const episodes = buildBasicEpisodes(airedUpTo);
    void storeEpisodeList(numId, {
      episodes,
      airedCount: airedUpTo,
      status: m.status,
      malId: m.idMal,
    });
    return { data: { totalEpisodes: episodes.length, episodes }, degraded: true };
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  try {
    let raw: { Media?: EpisodeMedia };
    try {
      raw = await queryAniList(QUERY, { id: numId });
    } catch (primaryErr) {
      console.error("Episodes primary query failed:", primaryErr);
      raw = await queryAniList(MINIMAL_QUERY, { id: numId });
    }

    const m = raw.Media;
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const payload = await loadEpisodeMedia(numId, m);
    return Response.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("Episodes fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch episodes";
    return Response.json({ error: message }, { status: 500 });
  }
}
