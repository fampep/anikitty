export const revalidate = 86400;

import { fetchMergedArtworkSources } from "@/lib/anime/art-sources";
import { fetchExternalMetadata } from "@/lib/anime/external-metadata";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ mappings: null, images: null, metadata: null });

  try {
    const res = await fetch(
      `https://api.ani.zip/mappings?anilist_id=${numId}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return Response.json({ mappings: null, images: null, metadata: null });

    const data = await res.json();
    const mappings = data.mappings ?? null;
    const aniZipImages = data.images ?? null;
    const aniZipEpisodes = data.episodes ?? null;

    const { images } = await fetchMergedArtworkSources({
      anilistId: numId,
      malId: mappings?.mal_id ?? null,
      tvdbId: mappings?.thetvdb_id ?? null,
      tmdbId: mappings?.themoviedb_id ?? null,
      aniZipImages,
      aniZipEpisodes,
    });

    const metadata = await fetchExternalMetadata({
      anilistId: numId,
      malId: mappings?.mal_id ?? null,
      tvdbId: mappings?.thetvdb_id ?? null,
      tmdbId: mappings?.themoviedb_id ?? null,
      imdbId: mappings?.imdb_id ?? null,
    });

    return Response.json({
      mappings,
      images,
      metadata,
    });
  } catch {
    return Response.json({ mappings: null, images: null, metadata: null });
  }
}
