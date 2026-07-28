import { searchVoiceActors } from "@/lib/core/voice-actors";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const language = url.searchParams.get("language") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(50, Math.max(1, parseInt(url.searchParams.get("perPage") || "30", 10)));

  if (q.trim().length < 2) {
    return Response.json({ results: [], hasNextPage: false, currentPage: page });
  }

  try {
    const data = await searchVoiceActors(q, language, page, perPage);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return Response.json(
      { results: [], hasNextPage: false, currentPage: page, error: "Search is unavailable right now." },
      { status: 503 },
    );
  }
}
