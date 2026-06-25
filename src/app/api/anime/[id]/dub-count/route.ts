import { hianime } from "@/lib/hianime";
import { queryAniList, toTitle } from "@/lib/anilist";

const TITLE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      title { english romaji }
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
    return Response.json({ sub: null, dub: null }, { status: 400 });
  }

  try {
    const raw = await queryAniList(TITLE_QUERY, { id: numId });
    const title = toTitle(raw.Media?.title);
    if (!title) return Response.json({ sub: null, dub: null });

    const suggestions = await hianime.searchSuggestions(title);
    const first = suggestions.suggestions?.[0];
    if (!first?.id) return Response.json({ sub: null, dub: null });

    const info = await hianime.getInfo(first.id);
    const episodes = info?.anime?.info?.stats?.episodes;

    return Response.json({
      sub: episodes?.sub ?? null,
      dub: episodes?.dub ?? null,
    });
  } catch {
    return Response.json({ sub: null, dub: null });
  }
}

export const maxDuration = 20;
