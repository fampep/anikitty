import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verify2faPendingToken } from "@/lib/auth-jwt";
import { buildAuthResponse } from "@/lib/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import { decryptTotpSecretForUser, verifyTotpCode } from "@/lib/totp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security";
import { isUserBanned } from "@/lib/moderation";

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`2fa:${ip}`, 15, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { pendingToken, code } = await req.json();
    if (!pendingToken || !code) {
      return NextResponse.json({ error: "Pending token and code are required" }, { status: 400 });
    }

    const userId = await verify2faPendingToken(pendingToken);
    if (!userId) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    if (isUserBanned(user)) {
      return NextResponse.json(
        { error: user.banReason ? `Account banned: ${user.banReason}` : "This account is banned." },
        { status: 403 },
      );
    }

    if (!user.totpEnabled || !user.totpSecret) {
      const authData = await buildAuthResponse(user, req);
      return jsonWithAuthCookie(authData, authData.anisurgeToken);
    }

    const decrypted = await decryptTotpSecretForUser(user.id, user.totpSecret);
    if (!decrypted.ok) {
      const authData = await buildAuthResponse(user, req);
      return jsonWithAuthCookie(authData, authData.anisurgeToken);
    }

    if (!verifyTotpCode(decrypted.secret, String(code))) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }

    const authData = await buildAuthResponse(user, req);
    return jsonWithAuthCookie(authData, authData.anisurgeToken);
  } catch (e) {
    console.error("[2fa-verify]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
