import { NextResponse } from "next/server";
import { extractToken, signMalOAuthState, verifyToken } from "@/lib/auth/auth-jwt";
import {
  buildMalAuthorizeUrl,
  generateCodeVerifier,
  getMalClientId,
  getMalClientSecret,
  getMalRedirectUri,
} from "@/lib/oauth/mal-oauth";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!getMalClientId()) {
    return NextResponse.json({ error: "MyAnimeList OAuth is not configured" }, { status: 503 });
  }

  if (!getMalClientSecret()) {
    return NextResponse.json(
      { error: "MyAnimeList OAuth secret is not configured" },
      { status: 503 },
    );
  }

  try {
    // PKCE "plain": the verifier is carried through the signed state and is
    // also sent as the challenge.
    const codeVerifier = generateCodeVerifier();
    const redirectUri = getMalRedirectUri(req);
    const state = await signMalOAuthState(payload.userId, codeVerifier, redirectUri);
    const url = buildMalAuthorizeUrl(state, redirectUri, codeVerifier);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to start MyAnimeList OAuth" }, { status: 500 });
  }
}
