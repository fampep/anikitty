import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { signPasskeyChallengeToken } from "@/lib/auth/auth-jwt";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { assertAuthSecretsConfigured } from "@/lib/security/security";
import { getWebAuthnRpId } from "@/lib/auth/webauthn";

export async function POST(req: Request) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) {
    return NextResponse.json({ error: misconfigured }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`passkey-login:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpId(req),
    userVerification: "preferred",
  });

  const pendingToken = await signPasskeyChallengeToken({
    purpose: "passkey_login",
    challenge: options.challenge,
  });

  return NextResponse.json({ options, pendingToken });
}
