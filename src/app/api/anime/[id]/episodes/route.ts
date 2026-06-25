import { queryAniList } from "@/lib/anilist";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
      status
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
`;

// Try to extract episode number from a streaming episode title.
// Crunchyroll titles are often "Episode 1 - Title" or "EP 1" etc.
const EP_NUM_RE = /(?:episode|ep\.?)\s*(\d+)/i;

function buildImageMap(streamingEps: Array<{ title: string; thumbnail?: string }>): Record<number, string> {
  const map: Record<number, string> = {};

  for (let i = 0; i < streamingEps.length; i++) {
    const ep = streamingEps[i];
    if (!ep.thumbnail) continue;

    const match = EP_NUM_RE.exec(ep.title ?? "");
    const num = match ? parseInt(match[1], 10) : i + 1;
    if (num > 0 && !map[num]) {
      map[num] = ep.thumbnail;
    }
  }

  return map;
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
    const raw = await queryAniList(QUERY, { id: numId });
    const m = raw.Media;
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const totalEpisodes = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 1);

    const count = Math.max(totalEpisodes, 1);
    const imageMap = buildImageMap(m.streamingEpisodes ?? []);

    const episodes = Array.from({ length: count }, (_, i) => ({
      title: `Episode ${i + 1}`,
      episodeId: `ep-${i + 1}`,
      number: i + 1,
      isFiller: false,
      image: imageMap[i + 1] ?? null,
    }));

    return Response.json({ data: { totalEpisodes: count, episodes } });
  } catch (err) {
    console.error("AniList episodes error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
