import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  extractToken,
  signEmailVerifyToken,
  verifyToken,
} from "@/lib/auth/auth-jwt";
import {
  isPlaceholderEmail,
  validateEmail,
} from "@/lib/auth/local-auth";
import { getCanonicalAppOrigin } from "@/lib/oauth/discord-oauth";
import { sendEmail } from "@/lib/email/send-email";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/** Request a verification link to claim / change the account email. */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limited = rateLimit(`email-change:${payload.userId}:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const emailError = validateEmail(typeof body.email === "string" ? body.email : "");
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const email = String(body.email).trim().toLowerCase();
    if (isPlaceholderEmail(email)) {
      return NextResponse.json({ error: "Enter a real email address" }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.email === email && user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, user.id)))
      .limit(1);
    if (taken) {
      return NextResponse.json({ error: "Email already taken" }, { status: 409 });
    }

    const verifyTokenJwt = await signEmailVerifyToken(user.id, email);
    const origin = getCanonicalAppOrigin(req);
    const link = `${origin}/settings?tab=security&verifyEmail=${encodeURIComponent(verifyTokenJwt)}`;

    const sent = await sendEmail({
      to: email,
      subject: "Verify your AniKitty email",
      text: [
        `Hi ${user.username},`,
        "",
        "Confirm this email for your AniKitty account so you can sign in and recover it without Discord:",
        link,
        "",
        "This link expires in 30 minutes. If you didn’t request this, ignore this email.",
      ].join("\n"),
    });

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      dev: sent.dev === true,
    });
  } catch (e) {
    console.error("[email-change request]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
