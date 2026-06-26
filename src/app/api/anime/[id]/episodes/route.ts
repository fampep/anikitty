import { queryAniList } from "@/lib/anilist";

export const revalidate = 3600;

const KITTY_BASE = "https://kittyapi.buzz";

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

    const clean = raw.replace(EP_PREFIX_RE, "").trim();
    if (clean && !EP_NUM_RE.test(clean) && !titleMap[num]) {
      titleMap[num] = clean;
    }
  }

  return { imageMap, titleMap };
}

// Try to pull episode thumbnails from kittyapi when AniList has none.
// Tries two common endpoint shapes; silently returns {} on any failure.
async function fetchKittyThumbnails(anilistId: number): Promise<Record<number, string>> {
  const endpoints = [
    `${KITTY_BASE}/provider/Miruro/episodes?anilistId=${anilistId}`,
    `${KITTY_BASE}/anime/${anilistId}/episodes`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();

      // data may be an array of episodes, or { episodes: [...] }
      const list: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.episodes)
        ? data.episodes
        : [];

      if (!list.length) continue;

      const map: Record<number, string> = {};
      for (const ep of list) {
        const e = ep as Record<string, unknown>;
        const num =
          typeof e.number === "number"
            ? e.number
            : typeof e.episode === "number"
            ? e.episode
            : typeof e.episodeNumber === "number"
            ? e.episodeNumber
            : null;
        const img =
          typeof e.image === "string"
            ? e.image
            : typeof e.thumbnail === "string"
            ? e.thumbnail
            : typeof e.img === "string"
            ? e.img
            : null;

        if (num && img) map[num] = img;
      }

      if (Object.keys(map).length > 0) return map;
    } catch {
      // try next
    }
  }

  return {};
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

    // If AniList gave us thumbnails for less than half the episodes, try kittyapi
    const anilistCoverage = Object.keys(imageMap).length;
    let kittyMap: Record<number, string> = {};
    if (anilistCoverage < count / 2) {
      kittyMap = await fetchKittyThumbnails(numId);
    }

    const episodes = Array.from({ length: count }, (_, i) => ({
      title: titleMap[i + 1] ?? `Episode ${i + 1}`,
      episodeId: `ep-${i + 1}`,
      number: i + 1,
      isFiller: false,
      // AniList first, kittyapi fallback
      image: imageMap[i + 1] ?? kittyMap[i + 1] ?? null,
    }));

    return Response.json({ data: { totalEpisodes: count, episodes } });
  } catch (err) {
    console.error("AniList episodes error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
