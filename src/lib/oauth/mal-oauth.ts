import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyMalOAuthState } from "@/lib/auth/auth-jwt";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAL_AUTHORIZE = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_TOKEN = "https://myanimelist.net/v1/oauth2/token";
const MAL_API = "https://api.myanimelist.net/v2";

export function getMalClientId(): string | null {
  return process.env.MAL_CLIENT_ID ?? null;
}

export function getMalClientSecret(): string | null {
  return process.env.MAL_CLIENT_SECRET ?? null;
}

export function getMalRedirectUri(req?: Request): string {
  if (process.env.MAL_REDIRECT_URI) return process.env.MAL_REDIRECT_URI;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req?.headers.get("origin") ??
    (req ? new URL(req.url).origin : null) ??
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/api/mal/oauth/callback`;
}

/** PKCE verifier. MAL only supports the "plain" method, so challenge === verifier. */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url"); // 64 chars, all PKCE-safe
}

export function buildMalAuthorizeUrl(state: string, redirectUri: string, codeChallenge: string): string {
  const clientId = getMalClientId();
  if (!clientId) throw new Error("MAL_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "plain",
    state,
  });
  return `${MAL_AUTHORIZE}?${params.toString()}`;
}

type MalTokens = { accessToken: string; refreshToken: string | null };

export async function exchangeMalCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<MalTokens | null> {
  const clientId = getMalClientId();
  const clientSecret = getMalClientSecret();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const res = await fetch(MAL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null };
}

export async function getMalUser(accessToken: string): Promise<{ id: number; name: string } | null> {
  const res = await fetch(`${MAL_API}/users/@me?fields=id,name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.id == null || !data?.name) return null;
  return { id: Number(data.id), name: String(data.name) };
}

export async function completeMalOAuth(
  code: string,
  state: string,
  req: Request,
): Promise<"connected" | "error"> {
  const parsed = await verifyMalOAuthState(state);
  if (!parsed) return "error";

  try {
    const redirectUri = getMalRedirectUri(req);
    const tokens = await exchangeMalCode(code, parsed.codeVerifier, redirectUri);
    if (!tokens) return "error";

    const viewer = await getMalUser(tokens.accessToken);
    if (!viewer) return "error";

    const db = getDb();
    await db
      .update(users)
      .set({
        malAccessToken: tokens.accessToken,
        malRefreshToken: tokens.refreshToken,
        malUserId: viewer.id,
        malUsername: viewer.name,
      })
      .where(eq(users.id, parsed.userId));

    return "connected";
  } catch (e) {
    console.error("[mal oauth callback]", e);
    return "error";
  }
}

export function malSettingsRedirect(req: Request, status: "connected" | "error") {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin;
  return NextResponse.redirect(`${origin.replace(/\/$/, "")}/settings?mal=${status}`);
}
