import { NextResponse } from "next/server";
import { refreshAllEpisodeAlerts } from "@/lib/episode-alerts";
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
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "40", 10)));

  const result = await refreshAllEpisodeAlerts({ limit });
  return NextResponse.json({ ok: true, ...result });
}

export const maxDuration = 60;
