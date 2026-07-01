import { NextResponse } from "next/server";
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

  return NextResponse.json({
    ok: true,
    message: "Automatic subtitle syncing disabled - subtitles are fetched on-demand when users watch shows",
  });
}

export const maxDuration = 120;
