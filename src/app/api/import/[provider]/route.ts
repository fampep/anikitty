import { AnilistMediaList } from "@/types/anilist-animes";
import { NextRequest, NextResponse } from "next/server";
import { mapAniListLists } from "@/lib/anilist-import";
import { extractToken, verifyToken } from "@/lib/auth-jwt";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_IMPORT_ITEMS = 500;

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ provider: string }> },
) {
  const params = await props.params;
  const { provider } = params;
  if (provider !== "anilist") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const token = extractToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`import:${payload.userId}`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json();
  const animeList = body.animes as AnilistMediaList[];

  if (!Array.isArray(animeList) || animeList.length === 0) {
    return NextResponse.json(
      { error: "No anime list provided" },
      { status: 400 },
    );
  }

  if (animeList.length > MAX_IMPORT_ITEMS) {
    return NextResponse.json(
      { error: `Import limited to ${MAX_IMPORT_ITEMS} entries per request` },
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
