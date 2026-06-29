import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getDb } from "@/db";
import { users, userPasskeys } from "@/db/schema";
import { verifyPasskeyChallengeToken, sign2faPendingToken } from "@/lib/auth/auth-jwt";
import { buildAuthResponse } from "@/lib/auth/auth-response";
import { jsonWithAuthCookie } from "@/lib/auth/auth-cookie";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { getWebAuthnOrigin, getWebAuthnRpId, passkeyRowToCredential } from "@/lib/auth/webauthn";
import { shouldPromptForTwoFactor } from "@/lib/auth/totp-reactive";
import { isUserBanned } from "@/lib/security/moderation";

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`passkey-login-verify:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const { pendingToken, response } = await req.json();
  if (!pendingToken || !response) {
    return NextResponse.json({ error: "Pending token and response are required" }, { status: 400 });
  }

  const challengeState = await verifyPasskeyChallengeToken(pendingToken, "passkey_login");
  if (!challengeState) {
    return NextResponse.json({ error: "Sign-in session expired. Try again." }, { status: 401 });
  }

  const credentialId = (response as AuthenticationResponseJSON).id;
  if (!credentialId) {
    return NextResponse.json({ error: "Invalid passkey response" }, { status: 400 });
  }

  const db = getDb();
  const [passkey] = await db
    .select()
    .from(userPasskeys)
    .where(eq(userPasskeys.credentialId, credentialId))
    .limit(1);

  if (!passkey) {
    return NextResponse.json({ error: "Unknown passkey" }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: response as AuthenticationResponseJSON,
      expectedChallenge: challengeState.challenge,
      expectedOrigin: getWebAuthnOrigin(req),
      expectedRPID: getWebAuthnRpId(req),
      credential: passkeyRowToCredential(passkey),
      requireUserVerification: false,
    });
  } catch (e) {
    console.error("[passkey login verify]", e);
    return NextResponse.json({ error: "Could not verify passkey" }, { status: 401 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 401 });
  }

  await db
    .update(userPasskeys)
    .set({
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(userPasskeys.id, passkey.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, passkey.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (isUserBanned(user)) {
    return NextResponse.json(
      { error: user.banReason ? `Account banned: ${user.banReason}` : "This account is banned." },
      { status: 403 },
    );
  }

  if (await shouldPromptForTwoFactor(user.id, user.totpEnabled, user.totpSecret)) {
    const token = await sign2faPendingToken(user.id);
    return NextResponse.json({ requires2fa: true, pendingToken: token });
  }

  const authData = await buildAuthResponse(user, req);
  return jsonWithAuthCookie(authData, authData.anisurgeToken);
}
