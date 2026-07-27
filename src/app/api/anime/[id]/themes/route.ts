import { NextResponse } from "next/server";
import { fetchAnimeThemesByAnilistId } from "@/lib/anime/animethemes-api";
import { proxiedThemeVideoUrl } from "@/lib/anime/animethemes-proxy";

function proxyPlayableVideoUrl<T extends { videoUrl: string }>(item: T): T {
  return { ...item, videoUrl: proxiedThemeVideoUrl(item.videoUrl) };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anilistId = parseInt(id, 10);
  if (!Number.isFinite(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "Invalid AniList id" }, { status: 400 });
  }

  try {
    const result = await fetchAnimeThemesByAnilistId(anilistId);
    if (!result) {
      return NextResponse.json({ themes: null });
    }

    const playables = result.playables.map(proxyPlayableVideoUrl);
    const themes = {
      ...result,
      playables,
      playback: result.playback ? proxyPlayableVideoUrl(result.playback) : null,
      themes: result.themes.map((theme) => ({
        ...theme,
        entries: theme.entries.map((entry) => ({
          ...entry,
          videos: entry.videos.map((video) => ({
            ...video,
            link: proxiedThemeVideoUrl(video.link),
          })),
        })),
      })),
    };

    return NextResponse.json({ themes });
  } catch {
    return NextResponse.json({ error: "Failed to load themes" }, { status: 502 });
  }
}
