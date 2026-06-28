import { NextResponse } from "next/server";
import { sign2faPendingToken } from "@/lib/auth-jwt";
import { buildAuthResponse } from "@/lib/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth-cookie";
import {
  findUserByIdentifier,
  verifyUserPassword,
} from "@/lib/local-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security";

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
    if (!user || !(await verifyUserPassword(user, password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.totpEnabled && user.totpSecret) {
      const pendingToken = await sign2faPendingToken(user.id);
      return NextResponse.json({
        requires2fa: true,
        pendingToken,
      });
    }

    const authData = await buildAuthResponse(user, req);
    return jsonWithAuthCookie(authData, authData.anisurgeToken);
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
