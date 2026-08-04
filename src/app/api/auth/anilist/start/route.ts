import { NextResponse } from "next/server";
import { signOAuthStateFor, extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { buildAniListAuthorizeUrl, getAniListClientId, getAniListRedirectUri } from "@/lib/oauth/anilist-oauth";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/** Start AniList OAuth for unauthenticated login (GET) or authenticated account linking (POST). */
export async function GET(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  if (!getAniListClientId()) {
    return NextResponse.redirect(new URL("/home?error=anilist_not_configured", req.url).toString());
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`anilist-login:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const state = await signOAuthStateFor("anilist_oauth");
    const redirectUri = getAniListRedirectUri(req);
    const url = buildAniListAuthorizeUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("[anilist start]", e);
    return NextResponse.redirect(new URL("/home?error=anilist_start_failed", req.url).toString());
  }
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!getAniListClientId()) {
    return NextResponse.json({ error: "AniList OAuth is not configured" }, { status: 503 });
  }

  try {
    const state = await signOAuthStateFor("anilist_oauth", payload.userId);
    const redirectUri = getAniListRedirectUri(req);
    const url = buildAniListAuthorizeUrl(state, redirectUri);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to start AniList OAuth" }, { status: 500 });
  }
}
