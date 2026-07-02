import { queryAniList } from "@/lib/oauth/anilist";
import { isBlockedAnime } from "@/lib/anime/content-policy";
import {
  fetchAllEpisodeImageSources,
  resolveEpisodeImage,
  resolveEpisodeTitle,
} from "@/lib/anime/episode-thumbnails";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      isAdult
      format
      genres
      episodes
      nextAiringEpisode { episode }
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
`;

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
    const raw = await queryAniList(QUERY, { id: numId });
    const m = raw.Media;
    if (!m || isBlockedAnime(m)) return Response.json({ error: "Not found" }, { status: 404 });

    const totalEpisodes = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 1);

    const count = Math.max(totalEpisodes, 1);

    const sources = await fetchAllEpisodeImageSources(
      numId,
      m.streamingEpisodes ?? [],
    );

    const episodes = Array.from({ length: count }, (_, i) => {
      const num = i + 1;
      const title = resolveEpisodeTitle(num, sources) ?? `Episode ${num}`;
      const zip = sources.anizip[num];

      return {
        title,
        episodeId: `ep-${num}`,
        number: num,
        isFiller: false,
        image: resolveEpisodeImage(num, sources),
        overview: zip?.overview ?? null,
        airDate: zip?.airDate ?? null,
      };
    });

    return Response.json({ data: { totalEpisodes: count, episodes } });
  } catch (err) {
    console.error("Episodes fetch error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
