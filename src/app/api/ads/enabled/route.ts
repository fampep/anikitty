import { NextResponse } from "next/server";
import { getGlobalClickAdsEnabled } from "@/lib/ads/global-click-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await getGlobalClickAdsEnabled();
  return NextResponse.json(
    { enabled },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
