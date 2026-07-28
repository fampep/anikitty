import { getVoiceActorFilmographyPage } from "@/lib/core/voice-actors";

export const revalidate = 86400;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);

  try {
    const data = await getVoiceActorFilmographyPage(numId, page);
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return Response.json(
      { error: "Filmography is unavailable right now.", roles: [], page, hasNextPage: false },
      { status: 503 },
    );
  }
}
