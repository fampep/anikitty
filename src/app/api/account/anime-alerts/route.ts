import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getUserEpisodeAlert, upsertEpisodeAlert } from "@/lib/watch/episode-alerts";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const anilistId = parseInt(url.searchParams.get("anilistId") ?? "", 10);
  if (Number.isNaN(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "anilistId required" }, { status: 400 });
  }

  const alert = await getUserEpisodeAlert(payload.userId, anilistId);
  return NextResponse.json({ alert });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const anilistId = parseInt(String(body.anilistId ?? ""), 10);
    if (Number.isNaN(anilistId) || anilistId <= 0) {
      return NextResponse.json({ error: "anilistId required" }, { status: 400 });
    }

    const notifySub = body.notifySub !== false;
    const notifyDub = body.notifyDub === true;

    if (!notifySub && !notifyDub) {
      return NextResponse.json({ error: "Enable sub or dub alerts" }, { status: 400 });
    }

    const alert = await upsertEpisodeAlert({
      userId: payload.userId,
      anilistId,
      animeTitle: body.animeTitle ?? null,
      animeThumbnail: body.animeThumbnail ?? null,
      notifySub,
      notifyDub,
      titles: [body.animeTitle, body.japaneseTitle],
      fallbackSub: typeof body.fallbackSub === "number" ? body.fallbackSub : undefined,
      status: body.status ?? null,
      malId: typeof body.malId === "number" ? body.malId : null,
    });

    return NextResponse.json({ alert });
  } catch (e) {
    console.error("[anime-alerts POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const anilistId = parseInt(url.searchParams.get("anilistId") ?? "", 10);
  if (Number.isNaN(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "anilistId required" }, { status: 400 });
  }

  const { removeEpisodeAlert } = await import("@/lib/watch/episode-alerts");
  await removeEpisodeAlert(payload.userId, anilistId);
  return NextResponse.json({ ok: true });
}
