import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import {
  findSignupConflict,
  hashPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/local-auth";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`signup:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many signups from this IP. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { username, email, password } = await req.json();

    if (!username?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Username, email and password are required" }, { status: 400 });
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const conflict = await findSignupConflict(normalizedUsername, normalizedEmail);
    if (conflict) {
      const field =
        conflict.email === normalizedEmail && conflict.username === normalizedUsername
          ? "Username and email"
          : conflict.email === normalizedEmail
            ? "Email"
            : "Username";
      return NextResponse.json({ error: `${field} already taken` }, { status: 409 });
    }

    const db = getDb();
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      })
      .returning();

    const { grantWelcomeKittycoins } = await import("@/lib/shop/kittycoins");
    await grantWelcomeKittycoins(db, user.id);

    const authData = await buildAuthResponse(user, req);
    return jsonWithAuthCookie(authData, authData.anisurgeToken);
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
