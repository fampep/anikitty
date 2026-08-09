import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getDb } from "@/db";
import { userPasskeys } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { signPasskeyChallengeToken } from "@/lib/auth/auth-jwt";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  defaultPasskeyDeviceName,
  getWebAuthnRpId,
  getWebAuthnRpName,
  parsePasskeyTransports,
  webAuthnUserId,
} from "@/lib/auth/webauthn";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const limited = checkRateLimit(`passkey-register:${user.id}`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const deviceName =
    typeof body.deviceName === "string" && body.deviceName.trim()
      ? body.deviceName.trim().slice(0, 120)
      : defaultPasskeyDeviceName(req);

  const db = getDb();
  const existing = await db
    .select({
      credentialId: userPasskeys.credentialId,
      transports: userPasskeys.transports,
    })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, user.id));

  const options = await generateRegistrationOptions({
    rpName: getWebAuthnRpName(),
    rpID: getWebAuthnRpId(req),
    userName: user.email,
    userDisplayName: user.username,
    userID: webAuthnUserId(user.id) as Uint8Array<ArrayBuffer>,
    attestationType: "none",
    excludeCredentials: existing.map((row) => ({
      id: row.credentialId,
      transports: parsePasskeyTransports(row.transports),
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  const pendingToken = await signPasskeyChallengeToken({
    purpose: "passkey_register",
    challenge: options.challenge,
    userId: user.id,
    deviceName,
  });

  return NextResponse.json({ options, pendingToken });
}
