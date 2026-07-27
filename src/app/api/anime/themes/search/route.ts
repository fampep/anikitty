import { NextResponse } from "next/server";
import { searchAnimeThemes } from "@/lib/anime/animethemes-api";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchAnimeThemes(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
