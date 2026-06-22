import { queryAniList } from "@/lib/anilist";

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
      status
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
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const totalEpisodes = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 1);

    const count = Math.max(totalEpisodes, 1);

    const episodes = Array.from({ length: count }, (_, i) => ({
      title: `Episode ${i + 1}`,
      episodeId: `ep-${i + 1}`,
      number: i + 1,
      isFiller: false,
    }));

    const data = { totalEpisodes: count, episodes };
    return Response.json({ data });
  } catch (err) {
    console.error("AniList episodes error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
