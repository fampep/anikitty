import { NextResponse } from "next/server";
import { verifySessionHandoff } from "@/lib/auth/auth-jwt";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/**
 * Exchange a short-lived OAuth handoff token for session cookies.
 * Used after Discord login when mobile browsers drop Set-Cookie on redirect.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`session-handoff:${ip}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const handoff = typeof body.handoff === "string" ? body.handoff : "";
    if (!handoff) {
      return NextResponse.json({ error: "Missing handoff token" }, { status: 400 });
    }

    const sessionToken = await verifySessionHandoff(handoff);
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Invalid or expired sign-in link. Try Discord again." },
        { status: 400 },
      );
    }

    return jsonWithAuthCookie({ ok: true }, sessionToken);
  } catch (e) {
    console.error("[session-handoff]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
