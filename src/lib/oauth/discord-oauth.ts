import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyOAuthStateFor, sign2faPendingToken } from "@/lib/auth/auth-jwt";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { redirectWithAuthCookie } from "@/lib/auth/auth-cookie";
import { shouldPromptForTwoFactor } from "@/lib/auth/totp-reactive";
import { isUserBanned } from "@/lib/security/moderation";

const DISCORD_AUTHORIZE = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN = "https://discord.com/api/oauth2/token";
const DISCORD_USER = "https://discord.com/api/users/@me";
const DISCORD_SCOPES = "identify email";

export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
};

export function getDiscordClientId(): string | null {
  return process.env.DISCORD_CLIENT_ID ?? null;
}

export function getDiscordClientSecret(): string | null {
  return process.env.DISCORD_CLIENT_SECRET ?? null;
}

export function isDiscordOAuthConfigured(): boolean {
  return !!(getDiscordClientId() && getDiscordClientSecret());
}

export function getDiscordRedirectUri(req?: Request): string {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req?.headers.get("origin") ??
    (req ? new URL(req.url).origin : null) ??
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/api/account/auth/discord/callback`;
}

export function buildDiscordAuthorizeUrl(state: string, redirectUri: string): string {
  const clientId = getDiscordClientId();
  if (!clientId) throw new Error("DISCORD_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES,
    state,
    prompt: "consent",
  });
  return `${DISCORD_AUTHORIZE}?${params.toString()}`;
}

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const clientId = getDiscordClientId();
  const clientSecret = getDiscordClientSecret();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(DISCORD_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  const res = await fetch(DISCORD_USER, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  return res.json();
}

export function discordAvatarUrl(user: DiscordUser, size = 128): string | null {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }
  let index = 0;
  if (user.id) {
    const tail = parseInt(user.id.slice(-4), 10);
    index = Number.isFinite(tail) ? tail % 6 : 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function discordDisplayName(user: DiscordUser): string {
  return user.global_name?.trim() || user.username;
}

function siteUsernameFromDiscord(user: DiscordUser): string {
  const cleaned = user.username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25);
  if (cleaned.length >= 3) return cleaned;
  return `d${user.id.slice(-8)}`.slice(0, 25);
}

async function uniqueUsername(base: string, discordId: string): Promise<string> {
  const db = getDb();
  let candidate = base.slice(0, 25);
  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate))
    .limit(1);
  if (!conflict) return candidate;
  candidate = `${base.slice(0, 20)}${discordId.slice(-4)}`.slice(0, 25);
  const [conflict2] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, candidate))
    .limit(1);
  if (!conflict2) return candidate;
  return `d${discordId.slice(-10)}`.slice(0, 25);
}

export async function findOrCreateUserFromDiscord(
  discordUser: DiscordUser,
): Promise<{ user: typeof users.$inferSelect; created: boolean } | "email_conflict"> {
  const db = getDb();
  const discordId = discordUser.id;
  const discordUsername = discordDisplayName(discordUser);
  const avatarUrl = discordAvatarUrl(discordUser);

  let [existing] = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (existing) {
    const updates: Partial<typeof users.$inferInsert> = { discordUsername };
    if (avatarUrl && !existing.avatarUrl) updates.avatarUrl = avatarUrl;
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, existing.id));
      existing = { ...existing, ...updates };
    }
    return { user: existing, created: false };
  }

  const email =
    discordUser.email && discordUser.verified
      ? discordUser.email.toLowerCase()
      : `discord_${discordId}@discord.account`;

  if (discordUser.email && discordUser.verified) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (byEmail) {
      if (byEmail.discordId && byEmail.discordId !== discordId) {
        return "email_conflict";
      }
      await db
        .update(users)
        .set({
          discordId,
          discordUsername,
          ...(avatarUrl && !byEmail.avatarUrl ? { avatarUrl } : {}),
        })
        .where(eq(users.id, byEmail.id));
      return { user: { ...byEmail, discordId, discordUsername }, created: false };
    }
  }

  const username = await uniqueUsername(siteUsernameFromDiscord(discordUser), discordId);
  const passwordHash = await bcrypt.hash(`discord_sso:${discordId}:${Date.now()}`, 10);

  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
      avatarUrl,
      discordId,
      discordUsername,
    })
    .returning();

  return { user: created, created: true };
}

export async function completeDiscordLink(
  code: string,
  state: string,
  req: Request,
): Promise<"connected" | "error" | "taken" | "already_linked"> {
  const linkState = await verifyOAuthStateFor(state, "discord_link");
  if (!linkState?.userId) return "error";

  try {
    const redirectUri = getDiscordRedirectUri(req);
    const accessToken = await exchangeDiscordCode(code, redirectUri);
    if (!accessToken) return "error";

    const discordUser = await fetchDiscordUser(accessToken);
    if (!discordUser) return "error";

    const db = getDb();
    const [current] = await db.select().from(users).where(eq(users.id, linkState.userId)).limit(1);
    if (!current) return "error";
    if (current.discordId === discordUser.id) return "connected";
    if (current.discordId) return "already_linked";

    const [other] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.discordId, discordUser.id))
      .limit(1);
    if (other && other.id !== current.id) return "taken";

    const avatarUrl = discordAvatarUrl(discordUser);
    await db
      .update(users)
      .set({
        discordId: discordUser.id,
        discordUsername: discordDisplayName(discordUser),
        ...(avatarUrl && !current.avatarUrl ? { avatarUrl } : {}),
      })
      .where(eq(users.id, current.id));

    const { bootstrapDiscordLevelAnnounce } = await import(
      "@/lib/bot/notify-discord-levelup"
    );
    await bootstrapDiscordLevelAnnounce(db, current.id);

    return "connected";
  } catch (e) {
    console.error("[discord oauth link]", e);
    return "error";
  }
}

export async function completeDiscordLogin(
  code: string,
  state: string,
  req: Request,
): Promise<
  | { type: "success"; token: string }
  | { type: "2fa"; pendingToken: string }
  | { type: "error"; reason: string }
> {
  const loginState = await verifyOAuthStateFor(state, "discord_login");
  if (loginState === null) return { type: "error", reason: "invalid_state" };

  try {
    const redirectUri = getDiscordRedirectUri(req);
    const accessToken = await exchangeDiscordCode(code, redirectUri);
    if (!accessToken) return { type: "error", reason: "token_exchange" };

    const discordUser = await fetchDiscordUser(accessToken);
    if (!discordUser) return { type: "error", reason: "user_fetch" };

    const result = await findOrCreateUserFromDiscord(discordUser);
    if (result === "email_conflict") {
      return { type: "error", reason: "email_conflict" };
    }

    const { user } = result;

    if (isUserBanned(user)) {
      return { type: "error", reason: "banned" };
    }

    if (await shouldPromptForTwoFactor(user.id, user.totpEnabled, user.totpSecret)) {
      const pendingToken = await sign2faPendingToken(user.id);
      return { type: "2fa", pendingToken };
    }

    const authData = await buildAuthResponse(user, req);
    return { type: "success", token: authData.anisurgeToken };
  } catch (e) {
    console.error("[discord oauth login]", e);
    return { type: "error", reason: "server" };
  }
}

export function discordSettingsRedirect(
  req: Request,
  status: "connected" | "error" | "taken" | "already_linked",
) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin;
  return NextResponse.redirect(
    `${origin.replace(/\/$/, "")}/settings?tab=connections&discord=${status}`,
  );
}

export function appOrigin(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

export function discordLoginErrorRedirect(req: Request, reason: string) {
  return NextResponse.redirect(`${appOrigin(req)}/home?discord=${reason}`);
}

export function discordLoginSuccessRedirect(req: Request, token: string) {
  return redirectWithAuthCookie(`${appOrigin(req)}/home?discord=welcome`, token);
}

export function discord2faRedirect(req: Request, pendingToken: string) {
  return NextResponse.redirect(
    `${appOrigin(req)}/auth/2fa?token=${encodeURIComponent(pendingToken)}`,
  );
}
