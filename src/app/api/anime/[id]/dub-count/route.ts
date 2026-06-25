import { queryAniList, toTitle } from "@/lib/anilist";

const TITLE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      title { english romaji }
    }
  }
`;

const KITTY_BASE = "https://kittyapi.buzz";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ hasDub: false });

  try {
    const raw = await queryAniList(TITLE_QUERY, { id: numId });
    const title = toTitle(raw.Media?.title);
    if (!title) return Response.json({ hasDub: false });

    const searchRes = await fetch(
      `${KITTY_BASE}/provider/Miruro/search?q=${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!searchRes.ok) return Response.json({ hasDub: false });

    const results: Array<{ url: string; hasDub: boolean }> = await searchRes.json();
    const match = results.find((r) => r.url === String(numId));

    return Response.json({ hasDub: match?.hasDub ?? false });
  } catch {
    return Response.json({ hasDub: false });
  }
}

export const maxDuration = 15;
