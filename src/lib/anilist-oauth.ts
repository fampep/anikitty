import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/auth-jwt";
import { getAniListViewer } from "@/lib/anilist-sync";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ANILIST_AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize";
const ANILIST_TOKEN = "https://anilist.co/api/v2/oauth/token";

export function getAniListClientId(): string | null {
  return process.env.ANILIST_CLIENT_ID ?? null;
}

export function getAniListClientSecret(): string | null {
  return process.env.ANILIST_CLIENT_SECRET ?? null;
}

export function getAniListRedirectUri(req?: Request): string {
  if (process.env.ANILIST_REDIRECT_URI) return process.env.ANILIST_REDIRECT_URI;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req?.headers.get("origin") ??
    (req ? new URL(req.url).origin : null) ??
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/sync`;
}

export function buildAniListAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = getAniListClientId();
  if (!clientId) throw new Error("ANILIST_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${ANILIST_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeAniListCode(
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const clientId = getAniListClientId();
  const clientSecret = getAniListClientSecret();
  if (!clientId || !clientSecret) return null;

  const res = await fetch(ANILIST_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function completeAniListOAuth(
  code: string,
  state: string,
  req: Request,
): Promise<"connected" | "error"> {
  const userId = await verifyOAuthState(state);
  if (!userId) return "error";

  try {
    const redirectUri = getAniListRedirectUri(req);
    const accessToken = await exchangeAniListCode(code, redirectUri);
    if (!accessToken) return "error";

    const viewer = await getAniListViewer(accessToken);
    if (!viewer) return "error";

    const db = getDb();
    await db
      .update(users)
      .set({
        anilistAccessToken: accessToken,
        anilistUserId: viewer.id,
        anilistUsername: viewer.name,
      })
      .where(eq(users.id, userId));

    return "connected";
  } catch (e) {
    console.error("[anilist oauth callback]", e);
    return "error";
  }
}

export function anilistSettingsRedirect(req: Request, status: "connected" | "error") {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin;
  return NextResponse.redirect(`${origin.replace(/\/$/, "")}/settings?anilist=${status}`);
}
