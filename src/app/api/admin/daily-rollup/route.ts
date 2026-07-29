import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { computeDailyRollup } from "@/lib/analytics/daily-rollup";

export async function POST(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const date =
    (body as { date?: string }).date ??
    new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  try {
    await computeDailyRollup(date);
    return NextResponse.json({ ok: true, date });
  } catch (e) {
    console.error("[daily-rollup] error:", e);
    return NextResponse.json({ error: "rollup failed" }, { status: 500 });
  }
}
