import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signPasswordResetToken } from "@/lib/auth/auth-jwt";
import {
  canReceiveAccountEmail,
  findUserByIdentifier,
  isPlaceholderEmail,
  validateEmail,
} from "@/lib/auth/local-auth";
import { getCanonicalAppOrigin } from "@/lib/oauth/discord-oauth";
import { sendEmail } from "@/lib/email/send-email";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";

/**
 * Start password recovery. Always returns a generic success message to avoid
 * account enumeration. Only emails verified (or Discord-verified) addresses.
 */
export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`forgot-password:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const generic = {
    ok: true,
    message:
      "If that email is on an AniKitty account, we sent a reset link. Check your inbox (and spam).",
  };

  try {
    const body = await req.json();
    const raw = typeof body.email === "string" ? body.email : "";
    if (validateEmail(raw)) {
      return NextResponse.json(generic);
    }

    const email = raw.trim().toLowerCase();
    if (isPlaceholderEmail(email)) {
      return NextResponse.json(generic);
    }

    const user = await findUserByIdentifier(email);
    if (!user) {
      return NextResponse.json(generic);
    }

    // Allow reset when email is verified, or when it came from Discord (verified at signup).
    const verified =
      canReceiveAccountEmail(user.email, user.emailVerifiedAt) ||
      (!isPlaceholderEmail(user.email) && !!user.discordId);

    if (!verified || user.email.toLowerCase() !== email) {
      return NextResponse.json(generic);
    }

    const resetToken = await signPasswordResetToken(user.id);
    const origin = getCanonicalAppOrigin(req);
    const link = `${origin}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

    const sent = await sendEmail({
      to: user.email,
      subject: "Reset your AniKitty password",
      text: [
        `Hi ${user.username},`,
        "",
        "Reset your AniKitty password with this link:",
        link,
        "",
        "This link expires in 30 minutes. If you didn’t request a reset, you can ignore this email.",
        user.discordId
          ? "You can also keep signing in with Discord after you set a password."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    if (!sent.ok) {
      console.error("[forgot-password] email failed", sent.error);
      // Still return generic — do not leak config gaps to attackers.
      return NextResponse.json(generic);
    }

    // Mark Discord-sourced emails as verified once we successfully mail them.
    if (!user.emailVerifiedAt) {
      await getDb()
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ ...generic, dev: sent.dev === true });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(generic);
  }
}
