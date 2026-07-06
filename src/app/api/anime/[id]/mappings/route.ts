export const revalidate = 86400;

import { fetchMergedArtworkSources } from "@/lib/anime/art-sources";
import { buildRatingsFromAniZip } from "@/lib/anime/anizip-ratings";
import { fetchExternalMetadataExtras } from "@/lib/anime/external-metadata";
import { queryAniList } from "@/lib/oauth/anilist";

const ANILIST_SCORE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      averageScore
      title { english romaji native }
    }
  }
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ mappings: null, images: null, metadata: null });

  try {
    const [aniZipRes, anilistRaw] = await Promise.all([
      fetch(`https://api.ani.zip/mappings?anilist_id=${numId}`, {
        signal: AbortSignal.timeout(10000),
      }),
      queryAniList(ANILIST_SCORE_QUERY, { id: numId }).catch(() => null),
    ]);

    if (!aniZipRes.ok) return Response.json({ mappings: null, images: null, metadata: null });

    const data = await aniZipRes.json();
    const mappings = data.mappings ?? null;
    const aniZipImages = data.images ?? null;
    const aniZipEpisodes = data.episodes ?? null;

    const anilistMedia = anilistRaw?.Media;
    const searchTitles = [
      anilistMedia?.title?.english,
      anilistMedia?.title?.romaji,
      anilistMedia?.title?.native,
    ];

    const [{ images }, extras] = await Promise.all([
      fetchMergedArtworkSources({
        anilistId: numId,
        malId: mappings?.mal_id ?? null,
        tvdbId: mappings?.thetvdb_id ?? null,
        tmdbId: mappings?.themoviedb_id ?? null,
        aniZipImages,
        aniZipEpisodes,
        searchTitles,
      }),
      fetchExternalMetadataExtras({
        malId: mappings?.mal_id ?? null,
        tvdbId: mappings?.thetvdb_id ?? null,
        tmdbId: mappings?.themoviedb_id ?? null,
        kitsuId: mappings?.kitsu_id ?? null,
      }),
    ]);

    const { ratings: extraRatings, ...extraMeta } = extras;
    const ratings = buildRatingsFromAniZip({
      anilistId: numId,
      anilistScore: anilistMedia?.averageScore ?? null,
      mappings,
      episodes: aniZipEpisodes,
      extraRatings,
    });

    return Response.json({
      mappings,
      images,
      metadata: {
        ratings,
        ...extraMeta,
      },
    });
  } catch {
    return Response.json({ mappings: null, images: null, metadata: null });
  }
}
