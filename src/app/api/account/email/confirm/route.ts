import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyEmailVerifyToken, verifyToken } from "@/lib/auth/auth-jwt";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/** Confirm email change / claim via token from the verification email. */
export async function POST(req: Request) {
  const sessionToken = extractToken(req);
  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifyToken(sessionToken);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limited = rateLimit(`email-confirm:${session.userId}:${ip}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      return NextResponse.json({ error: "Verification token required" }, { status: 400 });
    }

    const verified = await verifyEmailVerifyToken(token);
    if (!verified || verified.userId !== session.userId) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 },
      );
    }

    const db = getDb();
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, verified.email), ne(users.id, session.userId)))
      .limit(1);
    if (taken) {
      return NextResponse.json({ error: "Email already taken" }, { status: 409 });
    }

    await db
      .update(users)
      .set({
        email: verified.email,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, session.userId));

    return NextResponse.json({
      ok: true,
      email: verified.email,
      emailVerified: true,
    });
  } catch (e) {
    console.error("[email-confirm]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
