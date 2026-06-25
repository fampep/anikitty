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

// Matches "Episode 3 - " or "Ep. 3: " prefix to strip from Crunchyroll titles.
const EP_NUM_RE = /(?:episode|ep\.?)\s*(\d+)/i;
const EP_PREFIX_RE = /^(?:episode|ep\.?)\s*\d+\s*[-:–]\s*/i;

function buildMaps(streamingEps: Array<{ title: string; thumbnail?: string }>) {
  const imageMap: Record<number, string> = {};
  const titleMap: Record<number, string> = {};

  for (let i = 0; i < streamingEps.length; i++) {
    const ep = streamingEps[i];
    const raw = ep.title ?? "";

    const match = EP_NUM_RE.exec(raw);
    const num = match ? parseInt(match[1], 10) : i + 1;
    if (num <= 0) continue;

    if (ep.thumbnail && !imageMap[num]) {
      imageMap[num] = ep.thumbnail;
    }

    // Strip "Episode N - " prefix to get the actual episode title
    const clean = raw.replace(EP_PREFIX_RE, "").trim();
    if (clean && !EP_NUM_RE.test(clean) && !titleMap[num]) {
      // Only save if what's left isn't just another "Episode N" string
      titleMap[num] = clean;
    }
  }

  return { imageMap, titleMap };
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
    const { imageMap, titleMap } = buildMaps(m.streamingEpisodes ?? []);

    const episodes = Array.from({ length: count }, (_, i) => ({
      title: titleMap[i + 1] ?? `Episode ${i + 1}`,
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
