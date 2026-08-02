import { NextResponse } from "next/server";
import { getProviderHealthSummary } from "@/lib/analytics/provider-health";

// Public — same summary the admin Provider Health tab shows (no raw error
// messages/URLs in this shape, so nothing sensitive to redact).
export async function GET() {
  try {
    const summary = await getProviderHealthSummary();
    return NextResponse.json(
      { providers: summary },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  } catch (e) {
    console.error("[status/providers] route error:", e);
    return NextResponse.json({ providers: [] });
  }
}
