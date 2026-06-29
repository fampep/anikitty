import { NextResponse } from "next/server";
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

  // Subtitles are fetched on-demand when a user watches an episode (sub audio).
  return NextResponse.json({
    ok: true,
    disabled: true,
    message: "Background subtitle library sync is disabled; subs fetch on watch.",
  });
}

export const maxDuration = 120;
