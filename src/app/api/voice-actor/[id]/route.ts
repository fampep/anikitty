import { getVoiceActor } from "@/lib/core/voice-actors";

export const revalidate = 86400;

/** Profile + first filmography page only. Remaining credits: /api/voice-actors/[id]/filmography. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return Response.json({ error: "Invalid id" }, { status: 400 });

  try {
    const data = await getVoiceActor(numId);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return Response.json({ error: "Voice actor data is unavailable right now." }, { status: 503 });
  }
}
