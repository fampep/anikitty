import { NextResponse } from "next/server";
import { extractToken, signOAuthStateFor, verifyToken } from "@/lib/auth/auth-jwt";
import {
  buildDiscordAuthorizeUrl,
  discordLoginErrorRedirect,
  getDiscordRedirectUri,
  isDiscordOAuthConfigured,
} from "@/lib/oauth/discord-oauth";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/** Start Discord OAuth for login (GET) or account linking (POST). */
export async function GET(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  if (!isDiscordOAuthConfigured()) {
    return discordLoginErrorRedirect(req, "not_configured");
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`discord-login:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const state = await signOAuthStateFor("discord_login");
    const redirectUri = getDiscordRedirectUri(req);
    const url = buildDiscordAuthorizeUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Failed to start Discord OAuth" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isDiscordOAuthConfigured()) {
    return NextResponse.json({ error: "Discord OAuth is not configured" }, { status: 503 });
  }

  try {
    const state = await signOAuthStateFor("discord_link", payload.userId);
    const redirectUri = getDiscordRedirectUri(req);
    const url = buildDiscordAuthorizeUrl(state, redirectUri);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Failed to start Discord OAuth" }, { status: 500 });
  }
}
