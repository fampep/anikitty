import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import type { SkipDatabasePayload } from "@/lib/skip/community-skip-server";

type CoverMeta = {
  title: string;
  poster: string | null;
};

/** Lightweight batch: title + cover only (no streamingEpisodes — those payloads crush latency). */
const COVER_META_QUERY = `
  query ($ids: [Int], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji }
        coverImage { large medium }
      }
    }
  }
`;

async function fetchCoverMetaBatch(anilistIds: number[]): Promise<Map<number, CoverMeta>> {
  const map = new Map<number, CoverMeta>();
  if (anilistIds.length === 0) return map;

  const unique = [...new Set(anilistIds)];
  const chunkSize = 50;
  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const data = await queryAniList<{
          Page: {
            media: Array<{
              id: number;
              title: { english?: string | null; romaji?: string | null };
              coverImage?: { large?: string | null; medium?: string | null };
            }>;
          };
        }>(COVER_META_QUERY, { ids: chunk, page: 1, perPage: chunkSize });

        for (const m of data.Page?.media ?? []) {
          map.set(m.id, {
            title: toTitle(m.title),
            poster: m.coverImage?.large ?? m.coverImage?.medium ?? null,
          });
        }
      } catch {
        // Posters/titles are optional enrichment — skip failed chunks.
      }
    }),
  );

  return map;
}

function enrichGroups(
  groups: SkipDatabasePayload["live"],
  meta: Map<number, CoverMeta>,
) {
  for (const group of groups) {
    const m = meta.get(group.anilistId);
    if (!m) continue;
    if (m.title) group.animeTitle = m.title;
    group.posterUrl = m.poster;
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
  const meta = await fetchCoverMetaBatch(ids);
  enrichGroups(payload.live, meta);
  enrichGroups(payload.pending, meta);
  return payload;
}
