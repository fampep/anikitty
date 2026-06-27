import {
  ensureAnitakuSubtitleCache,
  listAnimeSubtitles,
} from "@/lib/subtitle-cache-store";
import { subtitleDownloadUrl } from "@/lib/subtitle-track-utils";

const SAFE_ID = /^\d{1,10}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  const anilistId = parseInt(id, 10);
  const { searchParams } = new URL(req.url);
  const episodeParam = searchParams.get("episode");
  const fetch = searchParams.get("fetch") === "1";
  const audioParam = searchParams.get("audio");
  const fetchAudio = audioParam === "dub" ? "dub" : "sub";

  if (fetch && episodeParam && SAFE_ID.test(episodeParam)) {
    const episode = parseInt(episodeParam, 10);
    if (episode > 0) {
      await ensureAnitakuSubtitleCache({ anilistId, episode, audio: fetchAudio });
    }
  }

  let rows = await listAnimeSubtitles(anilistId);

  if (episodeParam && SAFE_ID.test(episodeParam)) {
    const episode = parseInt(episodeParam, 10);
    rows = rows.filter((row) => row.episode === episode);
  }

  if (audioParam === "sub" || audioParam === "dub") {
    rows = rows.filter((row) => row.audio === audioParam);
  }

  return Response.json({
    data: rows.map((row) => ({
      id: row.id,
      episode: row.episode,
      audio: row.audio,
      label: row.label,
      isDefault: row.isDefault,
      fetchedAt: row.fetchedAt?.toISOString() ?? null,
      downloadUrl: subtitleDownloadUrl(row.id),
    })),
  });
}

export const maxDuration = 30;
