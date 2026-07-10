import { NextResponse } from "next/server";
import { runSubtitleLibrarySyncTick } from "@/lib/subtitles/subtitle-library-sync";
import { safeEqual } from "@/lib/security/security";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return safeEqual(auth.slice(7), secret);
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const incomplete = Math.min(
    12,
    Math.max(0, parseInt(url.searchParams.get("incomplete") ?? "6", 10) || 6),
  );
  const discover = Math.min(
    12,
    Math.max(0, parseInt(url.searchParams.get("discover") ?? "6", 10) || 6),
  );

  const result = await runSubtitleLibrarySyncTick({
    maxIncompleteAnime: incomplete,
    maxDiscover: discover,
    backfillLimit: 50,
    refreshLimit: 30,
  });

  return NextResponse.json({ ok: true, ...result });
}

export const maxDuration = 120;
