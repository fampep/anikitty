import { NextResponse } from "next/server";

const ANISKIP = "https://api.aniskip.com/v2";
const ANILIST = "https://graphql.anilist.co";

async function resolveMalId(anilistId: number): Promise<number | null> {
  try {
    const res = await fetch(ANILIST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "query($id:Int!){Media(id:$id,type:ANIME){idMal}}",
        variables: { id: anilistId },
      }),
    });
    const json = await res.json();
    return json?.data?.Media?.idMal ?? null;
  } catch {
    return null;
  }
}

async function applyRelationRules(
  malId: number,
  episode: number,
): Promise<{ malId: number; episode: number }> {
  try {
    const res = await fetch(`${ANISKIP}/relation-rules/${malId}`);
    if (!res.ok) return { malId, episode };
    const json = await res.json();
    if (!json.found) return { malId, episode };
    for (const rule of json.results ?? []) {
      if (episode >= rule.fromEpisode) {
        return {
          malId:   rule.toMalId,
          episode: episode - rule.fromEpisode + rule.toEpisode,
        };
      }
    }
  } catch { /* fall through */ }
  return { malId, episode };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const malIdParam   = parseInt(searchParams.get("malId") ?? "0");
  const anilistId    = parseInt(searchParams.get("anilistId") ?? "0");
  const episode      = parseFloat(searchParams.get("episode") ?? "");

  if (isNaN(episode)) return NextResponse.json({});

  // Resolve MAL ID
  let malId = malIdParam > 0 ? malIdParam : null;
  if (!malId && anilistId > 0) malId = await resolveMalId(anilistId);
  if (!malId) return NextResponse.json({});

  // Apply split-cour remapping
  const mapped = await applyRelationRules(malId, episode);

  // Fetch skip times
  const url =
    `${ANISKIP}/skip-times/${mapped.malId}/${mapped.episode}` +
    `?types[]=op&types[]=ed&episodeLength=0`;

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({});
    const json = await res.json();
    if (!json.found) return NextResponse.json({});

    const out: Record<string, { start: number; end: number }> = {};
    for (const result of json.results ?? []) {
      const { startTime, endTime } = result.interval ?? {};
      if (startTime == null || endTime == null) continue;
      if (result.skipType === "op") out.intro = { start: startTime, end: endTime };
      if (result.skipType === "ed") out.outro = { start: startTime, end: endTime };
    }
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({});
  }
}
