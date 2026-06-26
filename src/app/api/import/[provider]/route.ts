import { AnilistMediaList } from "@/types/anilist-animes";
import { NextRequest, NextResponse } from "next/server";
import { mapAniListLists } from "@/lib/anilist-import";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ provider: string }> },
) {
  const params = await props.params;
  const { provider } = params;
  if (provider !== "anilist") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const body = await request.json();
  const animeList = body.animes as AnilistMediaList[];

  if (!animeList || animeList.length === 0) {
    return NextResponse.json(
      { error: "No anime list provided" },
      { status: 400 },
    );
  }

  const apiKey = process.env.KITTY_API_KEY;
  const mappedAnimes = await mapAniListLists(animeList, apiKey);

  return NextResponse.json(
    {
      animes: mappedAnimes.map(({ id, title, thumbnail, status, anilistId, malId }) => ({
        id,
        title,
        thumbnail,
        status,
        anilistId,
        malId,
      })),
      total: mappedAnimes.length,
      skipped: 0,
    },
    { status: 200 },
  );
}

export const maxDuration = 120;
