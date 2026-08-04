import { NextResponse } from "next/server";
import { signOAuthStateFor } from "@/lib/auth/auth-jwt";
import { buildAniListAuthorizeUrl, getAniListClientId, getAniListRedirectUri } from "@/lib/oauth/anilist-oauth";

export async function GET(req: Request) {
  if (!getAniListClientId()) {
    return NextResponse.json({ error: "AniList OAuth is not configured" }, { status: 503 });
  }

  try {
    const state = await signOAuthStateFor("anilist_oauth");
    const redirectUri = getAniListRedirectUri(req);
    const url = buildAniListAuthorizeUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Failed to start AniList OAuth" }, { status: 500 });
  }
}
