import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyMalOAuthState } from "@/lib/auth/auth-jwt";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAL_AUTHORIZE = "https://myanimelist.net/v1/oauth2/authorize";
const MAL_TOKEN = "https://myanimelist.net/v1/oauth2/token";
const MAL_API = "https://api.myanimelist.net/v2";

export type MalOAuthFailure =
  | "missing_params"
  | "denied"
  | "invalid_state"
  | "not_configured"
  | "token_exchange"
  | "profile"
  | "unknown";

export function getMalClientId(): string | null {
  return process.env.MAL_CLIENT_ID?.trim() || null;
}

export function getMalClientSecret(): string | null {
  return process.env.MAL_CLIENT_SECRET?.trim() || null;
}

export function isMalOAuthConfigured(): boolean {
  return !!(getMalClientId() && getMalClientSecret());
}

export function malAppOrigin(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
    }
    const origin = req.headers.get("origin")?.trim();
    if (origin) return origin.replace(/\/$/, "");
    return new URL(req.url).origin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function getMalRedirectUri(req?: Request): string {
  if (process.env.MAL_REDIRECT_URI?.trim()) {
    return process.env.MAL_REDIRECT_URI.trim().replace(/\/$/, "");
  }
  return `${malAppOrigin(req)}/api/mal/oauth/callback`;
}

/** PKCE verifier. MAL only supports the "plain" method, so challenge === verifier. */
export function generateCodeVerifier(): string {
  // 48 bytes → 64 chars (MAL allows 43–128, charset A-Za-z0-9_-)
  return crypto.randomBytes(48).toString("base64url");
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
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  let res = await fetch(MAL_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  // Fallback: credentials in body (Scheme 2) for older MAL app configs.
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    const fallbackBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    });
    res = await fetch(MAL_TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: fallbackBody.toString(),
      signal: AbortSignal.timeout(15_000),
    });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[mal oauth] token exchange failed:", res.status, detail);
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!data?.access_token) return null;
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null };
}

export async function getMalUser(accessToken: string): Promise<{ id: number; name: string } | null> {
  const clientId = getMalClientId();
  const res = await fetch(`${MAL_API}/users/@me?fields=id,name`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(clientId ? { "X-MAL-CLIENT-ID": clientId } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[mal oauth] profile fetch failed:", res.status, detail);
    return null;
  }
  const data = await res.json();
  if (data?.id == null || !data?.name) return null;
  return { id: Number(data.id), name: String(data.name) };
}

export async function completeMalOAuth(
  code: string,
  state: string,
): Promise<"connected" | MalOAuthFailure> {
  const parsed = await verifyMalOAuthState(state);
  if (!parsed) return "invalid_state";

  if (!isMalOAuthConfigured()) return "not_configured";

  try {
    const tokens = await exchangeMalCode(code, parsed.codeVerifier, parsed.redirectUri);
    if (!tokens) return "token_exchange";

    const viewer = await getMalUser(tokens.accessToken);
    if (!viewer) return "profile";

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
    return "unknown";
  }
}

export function malSettingsRedirect(
  req: Request,
  status: "connected" | MalOAuthFailure,
) {
  const origin = malAppOrigin(req);
  const params = new URLSearchParams({ tab: "connections", mal: status === "connected" ? "connected" : "error" });
  if (status !== "connected") params.set("reason", status);
  return NextResponse.redirect(`${origin}/settings?${params.toString()}`);
}
