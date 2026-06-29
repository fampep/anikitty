import { queryAniList } from "@/lib/oauth/anilist";

export const revalidate = 3600;

const QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
      streamingEpisodes {
        title
        thumbnail
      }
    }
  }
`;

const EP_NUM_RE = /(?:episode|ep\.?)\s*(\d+)/i;
const EP_PREFIX_RE = /^(?:episode|ep\.?)\s*\d+\s*[-:–]\s*/i;

function buildAnilistMaps(streamingEps: Array<{ title: string; thumbnail?: string }>) {
  const imageMap: Record<number, string> = {};
  const titleMap: Record<number, string> = {};

  for (let i = 0; i < streamingEps.length; i++) {
    const ep = streamingEps[i];
    const raw = ep.title ?? "";
    const match = EP_NUM_RE.exec(raw);
    const num = match ? parseInt(match[1], 10) : i + 1;
    if (num <= 0) continue;

    if (ep.thumbnail && !imageMap[num]) imageMap[num] = ep.thumbnail;

    const clean = raw.replace(EP_PREFIX_RE, "").trim();
    if (clean && !EP_NUM_RE.test(clean) && !titleMap[num]) titleMap[num] = clean;
  }

  return { imageMap, titleMap };
}

// api.ani.zip is built on Fribb/anime-lists and returns TVDB episode images for free.
async function fetchAniZipEpisodes(
  anilistId: number,
): Promise<Record<number, { image?: string; title?: string }>> {
  try {
    const res = await fetch(
      `https://api.ani.zip/mappings?anilist_id=${anilistId}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return {};

    const data = await res.json();
    const eps: Record<string, unknown> = data?.episodes ?? {};
    const map: Record<number, { image?: string; title?: string }> = {};

    for (const [key, val] of Object.entries(eps)) {
      const num = parseInt(key, 10);
      if (!num || num <= 0) continue;
      const e = val as Record<string, unknown>;

      const image = typeof e.image === "string" ? e.image : undefined;
      // title field is { en, x-jat, ... }
      const titleObj = e.title as Record<string, string> | undefined;
      const title = titleObj?.en ?? titleObj?.["x-jat"] ?? undefined;

      map[num] = { image, title };
    }

    return map;
  } catch {
    return {};
  }
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
    // Fetch AniList (episode count + Crunchyroll thumbnails) and ani.zip in parallel
    const [raw, aniZip] = await Promise.all([
      queryAniList(QUERY, { id: numId }),
      fetchAniZipEpisodes(numId),
    ]);

    const m = raw.Media;
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const totalEpisodes = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 1);

    const count = Math.max(totalEpisodes, 1);
    const { imageMap: anilistImages, titleMap: anilistTitles } = buildAnilistMaps(
      m.streamingEpisodes ?? [],
    );

    const episodes = Array.from({ length: count }, (_, i) => {
      const num = i + 1;
      // Priority: AniList (Crunchyroll) image → ani.zip (TVDB) image → null
      const image = anilistImages[num] ?? aniZip[num]?.image ?? null;
      // Priority: AniList title → ani.zip title → generic fallback
      const title =
        anilistTitles[num] ??
        (aniZip[num]?.title && aniZip[num]!.title !== `Episode ${num}`
          ? aniZip[num]!.title
          : undefined) ??
        `Episode ${num}`;

      return {
        title,
        episodeId: `ep-${num}`,
        number: num,
        isFiller: false,
        image,
      };
    });

    return Response.json({ data: { totalEpisodes: count, episodes } });
  } catch (err) {
    console.error("Episodes fetch error:", err);
    return Response.json({ error: "Failed to fetch episodes" }, { status: 500 });
  }
}
