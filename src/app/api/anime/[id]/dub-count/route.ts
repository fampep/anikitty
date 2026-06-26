const KITTY_BASE = "https://kittyapi.buzz";

// Check dub availability by probing kittyapi directly with the anilist ID.
// No AniList or HiAnime dependency — kittyapi resolves the anime itself.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ hasDub: false });

  try {
    const res = await fetch(
      `${KITTY_BASE}/provider/Miruro/stream-direct?anilistId=${numId}&episode=1&audio=dub`,
      { signal: AbortSignal.timeout(6000) },
    );
    const data = await res.json();
    return Response.json({ hasDub: !!(data?.file) });
  } catch {
    return Response.json({ hasDub: false });
  }
}

export const maxDuration = 10;
