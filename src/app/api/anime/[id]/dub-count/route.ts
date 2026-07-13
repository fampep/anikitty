import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { getAudioAvailability } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";

const TITLE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { english romaji }
      episodes
      status
      nextAiringEpisode { episode airingAt }
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
    return Response.json({ sub: 0, dub: 0, hasSub: false, hasDub: false });
  }

  try {
    const raw = await queryAniList(TITLE_QUERY, { id: numId });
    const m = raw.Media;
    if (!m) {
      return Response.json({ sub: 0, dub: 0, hasSub: false, hasDub: false });
    }

    const fallbackSub = airedCountFromAnilist(m.nextAiringEpisode, {
      status: m.status,
      episodes: m.episodes,
    });

    const availability = await getAudioAvailability({
      anilistId: numId,
      malId: m.idMal,
      titles: [toTitle(m.title), m.title?.romaji, m.title?.english],
      fallbackSub,
      status: m.status,
    });

    return Response.json({
      sub: availability.sub,
      dub: availability.dub,
      hasSub: availability.hasSub,
      hasDub: availability.hasDub,
    });
  } catch {
    return Response.json({ sub: 0, dub: 0, hasSub: false, hasDub: false });
  }
}

export const maxDuration = 15;
