import { NextRequest, NextResponse } from "next/server";

// Add your own key at GIPHY_API_KEY env var. This demo key is rate-limited.
const GIPHY_KEY = process.env.GIPHY_API_KEY ?? "dc6zaTOxFJmzC";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ gifs: [] });

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=en`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ gifs: [] });

    const json = await res.json();
    const gifs = (json.data ?? []).map((g: any) => ({
      id: g.id,
      preview: g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url,
      original: g.images?.fixed_height?.url ?? g.images?.original?.url,
      width: g.images?.fixed_height_small?.width ?? "120",
      height: g.images?.fixed_height_small?.height ?? "90",
    }));

    return NextResponse.json({ gifs });
  } catch {
    return NextResponse.json({ gifs: [] });
  }
}
