import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import type { SkipDatabasePayload } from "@/lib/skip/community-skip-server";

type StreamingMeta = {
  title: string;
  poster: string | null;
  episodeTitles: Map<number, string>;
  episodeThumbs: Map<number, string>;
};

const STREAMING_META_QUERY = `
  query ($ids: [Int], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji }
        coverImage { extraLarge large medium }
        streamingEpisodes { title thumbnail }
      }
    }
  }
`;

async function fetchStreamingMetaBatch(anilistIds: number[]): Promise<Map<number, StreamingMeta>> {
  const map = new Map<number, StreamingMeta>();
  if (anilistIds.length === 0) return map;

  const unique = [...new Set(anilistIds)];
  const chunkSize = 50;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    try {
      const data = await queryAniList<{
        Page: {
          media: Array<{
            id: number;
            title: { english?: string | null; romaji?: string | null };
            coverImage?: { extraLarge?: string | null; large?: string | null; medium?: string | null };
            streamingEpisodes?: Array<{ title?: string | null; thumbnail?: string | null }>;
          }>;
        };
      }>(STREAMING_META_QUERY, { ids: chunk, page: 1, perPage: chunkSize });

      for (const m of data.Page?.media ?? []) {
        const episodeTitles = new Map<number, string>();
        const episodeThumbs = new Map<number, string>();
        for (let idx = 0; idx < (m.streamingEpisodes?.length ?? 0); idx++) {
          const ep = m.streamingEpisodes![idx];
          const num = idx + 1;
          if (ep.title?.trim()) episodeTitles.set(num, ep.title.trim());
          if (ep.thumbnail?.trim()) episodeThumbs.set(num, ep.thumbnail.trim());
        }
        map.set(m.id, {
          title: toTitle(m.title),
          poster:
            m.coverImage?.extraLarge ??
            m.coverImage?.large ??
            m.coverImage?.medium ??
            null,
          episodeTitles,
          episodeThumbs,
        });
      }
    } catch {
      // Posters/titles are optional enrichment — skip failed chunks.
    }
  }

  return map;
}

function enrichGroups(
  groups: SkipDatabasePayload["live"],
  meta: Map<number, StreamingMeta>,
) {
  for (const group of groups) {
    const m = meta.get(group.anilistId);
    if (!m) continue;
    if (m.title) group.animeTitle = m.title;
    group.posterUrl = m.poster;
    for (const ep of group.episodes) {
      const epTitle = m.episodeTitles.get(ep.episode);
      if (epTitle) ep.episodeTitle = epTitle;
      const thumb = m.episodeThumbs.get(ep.episode);
      if (thumb) ep.episodeThumbnail = thumb;
    }
  }
}

export async function enrichSkipDatabasePayload(
  payload: SkipDatabasePayload,
): Promise<SkipDatabasePayload> {
  const ids = [
    ...new Set([
      ...payload.live.map((g) => g.anilistId),
      ...payload.pending.map((g) => g.anilistId),
    ]),
  ];
  const meta = await fetchStreamingMetaBatch(ids);
  enrichGroups(payload.live, meta);
  enrichGroups(payload.pending, meta);
  return payload;
}
