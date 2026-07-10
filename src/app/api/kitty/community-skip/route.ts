import { NextResponse } from "next/server";
import { getApprovedCommunitySkipTimes } from "@/lib/skip/community-skip-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const anilistId = parseInt(url.searchParams.get("anilistId") ?? "", 10);
  const episode = parseInt(url.searchParams.get("episode") ?? "", 10);

  if (!anilistId || !episode) {
    return NextResponse.json({ error: "anilistId and episode required" }, { status: 400 });
  }

  const skipTimes = await getApprovedCommunitySkipTimes(anilistId, episode);
  return NextResponse.json(skipTimes);
}
