import { NextResponse } from "next/server";
import { verifyOAuthStateFor, signToken } from "@/lib/auth/auth-jwt";
import { getAniListViewer } from "@/lib/oauth/anilist-sync";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/user/user-sessions";
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
): Promise<{ status: "connected" | "logged_in" | "error"; userId?: string }> {
  const statePayload = await verifyOAuthStateFor(state, "anilist_oauth");
  if (!statePayload) return { status: "error" };

  try {
    const redirectUri = getAniListRedirectUri(req);
    const accessToken = await exchangeAniListCode(code, redirectUri);
    if (!accessToken) return { status: "error" };

    const viewer = await getAniListViewer(accessToken);
    if (!viewer) return { status: "error" };

    const db = getDb();

    // If user is already logged in, just link the account
    if (statePayload.userId) {
      await db
        .update(users)
        .set({
          anilistAccessToken: accessToken,
          anilistUserId: viewer.id,
          anilistUsername: viewer.name,
        })
        .where(eq(users.id, statePayload.userId));
      return { status: "connected", userId: statePayload.userId };
    }

    // Otherwise, try to find or create user via AniList ID
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.anilistUserId, viewer.id))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user's token
      await db
        .update(users)
        .set({
          anilistAccessToken: accessToken,
        })
        .where(eq(users.id, existingUser[0].id));
      return { status: "logged_in", userId: existingUser[0].id };
    }

    // Create new user from AniList data
    const newUser = await db
      .insert(users)
      .values({
        username: viewer.name,
        email: `${viewer.name}@anilist.local`,
        anilistUserId: viewer.id,
        anilistUsername: viewer.name,
        anilistAccessToken: accessToken,
        emailVerified: true,
      })
      .returning({ id: users.id })
      .then((r) => r[0]);

    if (!newUser) return { status: "error" };
    return { status: "logged_in", userId: newUser.id };
  } catch (e) {
    console.error("[anilist oauth callback]", e);
    return { status: "error" };
  }
}

export async function anilistSettingsRedirect(req: Request, result: { status: "connected" | "logged_in" | "error"; userId?: string }) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin;
  const { status, userId } = result;

  // Redirect login flow to home with session, linking flow to settings
  if (status === "logged_in" && userId) {
    try {
      const db = getDb();
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=user_not_found`);
      }

      const userData = user[0];
      const session = await createSession(userId, req);
      const token = await signToken({
        userId: userData.id,
        username: userData.username,
        role: userData.role || "user",
        sessionId: session.id,
      });

      const response = NextResponse.redirect(`${origin.replace(/\/$/, "")}/home`);
      response.cookies.set({
        name: "auth-token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    } catch (e) {
      console.error("[anilist login redirect]", e);
      return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=session_failed`);
    }
  }

  return NextResponse.redirect(`${origin.replace(/\/$/, "")}/settings?anilist=${status}`);
}
