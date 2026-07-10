import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/auth/auth-jwt";
import { getAniListViewer } from "@/lib/oauth/anilist-sync";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ANILIST_AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize";
const ANILIST_TOKEN = "https://anilist.co/api/v2/oauth/token";

export type AniListTokens = {
  accessToken: string;
  refreshToken: string | null;
};

export function getAniListClientId(): string | null {
  return process.env.ANILIST_CLIENT_ID ?? null;
}

export function getAniListClientSecret(): string | null {
  return process.env.ANILIST_CLIENT_SECRET ?? null;
}

/** Stable redirect URI — must match exactly between authorize and token exchange. */
export function getAniListRedirectUri(req?: Request): string {
  if (process.env.ANILIST_REDIRECT_URI) return process.env.ANILIST_REDIRECT_URI;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
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

function parseTokenResponse(data: Record<string, unknown>): AniListTokens | null {
  const accessToken = typeof data.access_token === "string" ? data.access_token : null;
  if (!accessToken) return null;
  const refreshToken =
    typeof data.refresh_token === "string" ? data.refresh_token : null;
  return { accessToken, refreshToken };
}

export async function exchangeAniListCode(
  code: string,
  redirectUri: string,
): Promise<AniListTokens | null> {
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

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[anilist oauth] token exchange failed:", res.status, err);
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  return parseTokenResponse(data);
}

export async function refreshAniListAccessToken(
  refreshToken: string,
): Promise<AniListTokens | null> {
  const clientId = getAniListClientId();
  const clientSecret = getAniListClientSecret();
  if (!clientId || !clientSecret) return null;

  const res = await fetch(ANILIST_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[anilist oauth] token refresh failed:", res.status, err);
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  return parseTokenResponse(data);
}

export async function storeAniListTokens(
  userId: string,
  tokens: AniListTokens,
  viewer: { id: number; name: string },
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({
      anilistAccessToken: tokens.accessToken,
      anilistRefreshToken: tokens.refreshToken,
      anilistUserId: viewer.id,
      anilistUsername: viewer.name,
    })
    .where(eq(users.id, userId));
}

export async function resolveAniListAccessToken(
  userId: string,
  opts?: { forceRefresh?: boolean },
): Promise<string | null> {
  const db = getDb();
  const [user] = await db
    .select({
      anilistAccessToken: users.anilistAccessToken,
      anilistRefreshToken: users.anilistRefreshToken,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.anilistAccessToken && !user?.anilistRefreshToken) return null;

  if (!opts?.forceRefresh && user.anilistAccessToken) {
    return user.anilistAccessToken;
  }

  if (!user.anilistRefreshToken) {
    return user.anilistAccessToken ?? null;
  }

  const refreshed = await refreshAniListAccessToken(user.anilistRefreshToken);
  if (!refreshed) return user.anilistAccessToken ?? null;

  await db
    .update(users)
    .set({
      anilistAccessToken: refreshed.accessToken,
      ...(refreshed.refreshToken
        ? { anilistRefreshToken: refreshed.refreshToken }
        : {}),
    })
    .where(eq(users.id, userId));

  return refreshed.accessToken;
}

export function isAniListAuthError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lower = msg.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid token") ||
    lower.includes("not authenticated") ||
    lower.includes("ani_list_unauthorized")
  );
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
    const tokens = await exchangeAniListCode(code, redirectUri);
    if (!tokens) return "error";

    const viewer = await getAniListViewer(tokens.accessToken);
    if (!viewer) return "error";

    await storeAniListTokens(userId, tokens, viewer);
    return "connected";
  } catch (e) {
    console.error("[anilist oauth callback]", e);
    return "error";
  }
}

export function anilistSettingsRedirect(req: Request, status: "connected" | "error") {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin;
  return NextResponse.redirect(`${origin.replace(/\/$/, "")}/settings?anilist=${status}`);
}
