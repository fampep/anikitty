import { NextResponse } from "next/server";
import { extractToken, signOAuthState, verifyToken } from "@/lib/auth-jwt";
import { buildAniListAuthorizeUrl, getAniListClientId, getAniListRedirectUri } from "@/lib/anilist-oauth";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!getAniListClientId()) {
    return NextResponse.json({ error: "AniList OAuth is not configured" }, { status: 503 });
  }

  try {
    const state = await signOAuthState(payload.userId);
    const redirectUri = getAniListRedirectUri(req);
    const url = buildAniListAuthorizeUrl(state, redirectUri);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to start AniList OAuth" }, { status: 500 });
  }
}
