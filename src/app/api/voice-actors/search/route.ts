import { searchVoiceActors } from "@/lib/core/voice-actors";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const language = url.searchParams.get("language") ?? "";
  if (q.trim().length < 2) return Response.json({ results: [] });

  try {
    const results = await searchVoiceActors(q, language);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ results: [], error: "Search is unavailable right now." }, { status: 503 });
  }
}
