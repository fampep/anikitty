import { queryAniList } from "@/lib/anilist";

export const revalidate = 3600; // cache episode images for 1 hour

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      idMal
      episodes
      nextAiringEpisode { episode }
      status
    }
  }
`;

async function fetchJikanImages(malId: number): Promise<Record<number, string>> {
  const images: Record<number, string> = {};
  try {
    // Jikan returns up to 100 episodes per page; fetch first 3 pages (300 eps)
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) break;
      const json = await res.json();
      const items: any[] = json.data ?? [];
      if (items.length === 0) break;
      for (const ep of items) {
        const img = ep.images?.jpg?.image_url;
        if (img && ep.mal_id) images[ep.mal_id] = img;
      }
      if (items.length < 100) break; // last page
      // respect jikan rate limit (3 req/s)
      if (page < 3) await new Promise((r) => setTimeout(r, 380));
    }
  } catch {
    // jikan unavailable — return empty map, thumbnails just won't show
  }
  return images;
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

    // Fetch episode images from jikan in parallel with episode list build
    const imageMap = m.idMal ? await fetchJikanImages(m.idMal) : {};

    const episodes = Array.from({ length: count }, (_, i) => ({
      title: `Episode ${i + 1}`,
      episodeId: `ep-${i + 1}`,
      number: i + 1,
      isFiller: false,
      // jikan episode numbers are 1-based and match anime episode numbers
      image: imageMap[i + 1] ?? null,
    }));

    const data = { totalEpisodes: count, episodes };
    return Response.json({ data });
  } catch (err) {
    console.error("AniList episodes error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
