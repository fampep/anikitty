import { NextResponse } from "next/server";
import { sign2faPendingToken } from "@/lib/auth/auth-jwt";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import { grantDailyLoginKittycoins } from "@/lib/shop/kittycoins";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  findUserByIdentifier,
  verifyUserPassword,
} from "@/lib/auth/local-auth";
import { shouldPromptForTwoFactor } from "@/lib/auth/totp-reactive";
import { isUserBanned } from "@/lib/security/moderation";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier?.trim() || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Discord SSO-only accounts (random hash, never set a password).
    if (!user.passwordSetAt && user.discordId) {
      return NextResponse.json(
        {
            error:
              "This account uses Discord sign-in. Continue with Discord, or recover with a recovery code from signup.",
        },
        { status: 401 },
      );
    }

    if (!(await verifyUserPassword(user, password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Backfill for legacy email/password accounts created before passwordSetAt existed.
    if (!user.passwordSetAt) {
      void getDb()
        .update(users)
        .set({ passwordSetAt: new Date() })
        .where(eq(users.id, user.id));
    }

    if (isUserBanned(user)) {
      return NextResponse.json(
        { error: user.banReason ? `Account banned: ${user.banReason}` : "This account is banned." },
        { status: 403 },
      );
    }

    if (await shouldPromptForTwoFactor(user.id, user.totpEnabled, user.totpSecret)) {
      const pendingToken = await sign2faPendingToken(user.id);
      return NextResponse.json({
        requires2fa: true,
        pendingToken,
      });
    }

    const authData = await buildAuthResponse(user, req);
    void grantDailyLoginKittycoins(getDb(), user.id);
    return jsonWithAuthCookie(authData, authData.anisurgeToken);
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
