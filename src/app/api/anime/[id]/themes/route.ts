import { NextResponse } from "next/server";
import { fetchAnimeThemesByAnilistId } from "@/lib/anime/animethemes-api";

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
    return NextResponse.json({ themes: result });
  } catch {
    return NextResponse.json({ error: "Failed to load themes" }, { status: 502 });
  }
}
