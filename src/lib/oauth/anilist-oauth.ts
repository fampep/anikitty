import { NextResponse } from "next/server";
import { verifyOAuthStateFor, signToken } from "@/lib/auth/auth-jwt";
import { getAniListViewer } from "@/lib/oauth/anilist-sync";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/user/user-sessions";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ANILIST_AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize";
const ANILIST_TOKEN = "https://anilist.co/api/v2/oauth/token";

async function uniqueUsername(base: string, anilistId: number): Promise<string> {
  const db = getDb();
  let candidate = base.slice(0, 25);
  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate))
    .limit(1);
  if (!conflict) return candidate;
  candidate = `${base.slice(0, 20)}${String(anilistId).slice(-4)}`.slice(0, 25);
  const [conflict2] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate))
    .limit(1);
  if (!conflict2) return candidate;
  return `a${String(anilistId).slice(-10)}`.slice(0, 25);
}

async function findOrCreateUserFromAniList(
  viewer: { id: number; name: string },
  accessToken: string,
): Promise<{ user: typeof users.$inferSelect; created: boolean } | null> {
  const db = getDb();
  const anilistId = viewer.id;
  const anilistUsername = viewer.name;

  // Check if user already exists by AniList ID
  const [existing] = await db.select().from(users).where(eq(users.anilistUserId, anilistId)).limit(1);
  if (existing) {
    // Update token if changed
    if (existing.anilistAccessToken !== accessToken) {
      await db
        .update(users)
        .set({
          anilistAccessToken: accessToken,
          anilistUsername,
        })
        .where(eq(users.id, existing.id));
      return { user: { ...existing, anilistAccessToken: accessToken, anilistUsername }, created: false };
    }
    return { user: existing, created: false };
  }

  // Create new user from AniList data
  const username = await uniqueUsername(anilistUsername, anilistId);
  const email = `anilist_${anilistId}@anikitty.local`;
  const passwordHash = await bcrypt.hash(`anilist_sso:${anilistId}:${Date.now()}`, 10);

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
      anilistUserId: anilistId,
      anilistUsername,
      anilistAccessToken: accessToken,
      emailVerified: true,
      passwordSetAt: null,
    })
    .returning();

  if (!created) {
    console.error("[anilist] Failed to create user", { anilistId, username });
    return null;
  }

  return { user: created, created: true };
}

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

    // For login: find or create user from AniList data
    const result = await findOrCreateUserFromAniList(viewer, accessToken);
    if (!result) return { status: "error" };

    return { status: "logged_in", userId: result.user.id };
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
        console.error("[anilist login] User not found after creation", { userId });
        return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=user_not_found`);
      }

      const userData = user[0];
      const session = await createSession(userId, req);
      if (!session?.id) {
        console.error("[anilist login] Session creation failed", { userId });
        return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=session_failed`);
      }

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

      console.log("[anilist login] Successful login", { userId, username: userData.username });
      return response;
    } catch (e) {
      console.error("[anilist login redirect]", e);
      return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=session_failed`);
    }
  }

  if (status === "error") {
    console.error("[anilist oauth] OAuth flow failed");
    return NextResponse.redirect(`${origin.replace(/\/$/, "")}/home?error=anilist_failed`);
  }

  return NextResponse.redirect(`${origin.replace(/\/$/, "")}/settings?anilist=${status}`);
}
