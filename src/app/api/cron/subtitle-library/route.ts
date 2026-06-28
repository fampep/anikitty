import { NextResponse } from "next/server";
import { runSubtitleLibrarySyncTick } from "@/lib/subtitle-library-sync";
import { safeEqual } from "@/lib/security";

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
    8,
    Math.max(0, parseInt(url.searchParams.get("incomplete") ?? "0", 10) || 0),
  );
  const discover = Math.min(
    8,
    Math.max(0, parseInt(url.searchParams.get("discover") ?? "0", 10) || 0),
  );

  const result = await runSubtitleLibrarySyncTick({
    maxIncompleteAnime: incomplete,
    maxDiscover: discover,
    episodesPerAnime: incomplete > 0 || discover > 0 ? 8 : 0,
    backfillLimit: 50,
    refreshLimit: 30,
  });

  return NextResponse.json({ ok: true, ...result });
}

export const maxDuration = 120;
