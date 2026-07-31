import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  findUserByIdentifier,
  hashPassword,
  validatePassword,
} from "@/lib/auth/local-auth";
import { consumeRecoveryCode } from "@/lib/auth/recovery-codes";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import { isUserBanned } from "@/lib/security/moderation";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { revokeAllUserSessions } from "@/lib/user/user-sessions";

/**
 * Recover an account with username/email + one unused recovery code,
 * then set a new password and sign in.
 */
export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`recover-code:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const code = typeof body.code === "string" ? body.code : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier || !code) {
      return NextResponse.json(
        { error: "Username/email and recovery code are required" },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: "Invalid recovery code or account" }, { status: 401 });
    }

    if (isUserBanned(user)) {
      return NextResponse.json(
        { error: user.banReason ? `Account banned: ${user.banReason}` : "This account is banned." },
        { status: 403 },
      );
    }

    const ok = await consumeRecoveryCode(user.id, code);
    if (!ok) {
      return NextResponse.json({ error: "Invalid recovery code or account" }, { status: 401 });
    }

    const passwordHash = await hashPassword(password);
    const db = getDb();
    await db
      .update(users)
      .set({ passwordHash, passwordSetAt: new Date() })
      .where(eq(users.id, user.id));

    try {
      await revokeAllUserSessions(user.id);
    } catch {
      /* best-effort */
    }

    const authData = await buildAuthResponse(
      { ...user, passwordHash, passwordSetAt: new Date() },
      req,
    );
    return jsonWithAuthCookie(
      {
        ...authData,
        recovered: true,
        message: "Password updated. Sign in with this password next time.",
      },
      authData.token,
    );
  } catch (e) {
    console.error("[recover-with-code]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
