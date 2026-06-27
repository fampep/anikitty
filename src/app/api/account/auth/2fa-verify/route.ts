import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verify2faPendingToken } from "@/lib/auth-jwt";
import { buildAuthResponse } from "@/lib/auth-response";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security";

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

    if (!user?.totpEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled" }, { status: 400 });
    }

    const secret = decryptTotpSecret(user.totpSecret);
    if (!verifyTotpCode(secret, String(code))) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
    }

    return NextResponse.json(await buildAuthResponse(user, req));
  } catch (e) {
    console.error("[2fa-verify]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
