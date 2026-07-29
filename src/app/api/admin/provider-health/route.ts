import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { getProviderHealthSummary } from "@/lib/analytics/provider-health";

export async function GET(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const summary = await getProviderHealthSummary();
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[provider-health] route error:", e);
    return NextResponse.json([]);
  }
}
