import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getDb } from "@/db";
import { userPasskeys } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/require-user";
import { verifyPasskeyChallengeToken } from "@/lib/auth-jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getWebAuthnOrigin,
  getWebAuthnRpId,
  serializePasskeyTransports,
} from "@/lib/webauthn";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const limited = checkRateLimit(`passkey-register-verify:${user.id}`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  const { pendingToken, response } = await req.json();
  if (!pendingToken || !response) {
    return NextResponse.json({ error: "Pending token and response are required" }, { status: 400 });
  }

  const challengeState = await verifyPasskeyChallengeToken(pendingToken, "passkey_register");
  if (!challengeState || challengeState.userId !== user.id) {
    return NextResponse.json({ error: "Registration session expired. Try again." }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge: challengeState.challenge,
      expectedOrigin: getWebAuthnOrigin(req),
      expectedRPID: getWebAuthnRpId(req),
      requireUserVerification: false,
    });
  } catch (e) {
    console.error("[passkey register verify]", e);
    return NextResponse.json({ error: "Could not verify passkey" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey verification failed" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const transports =
    response.response?.transports ?? credential.transports ?? undefined;

  const db = getDb();
  try {
    const [created] = await db
      .insert(userPasskeys)
      .values({
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        deviceName: challengeState.deviceName ?? "Passkey",
        transports: serializePasskeyTransports(transports),
        backedUp: credentialBackedUp,
        deviceType: credentialDeviceType,
      })
      .returning({
        id: userPasskeys.id,
        deviceName: userPasskeys.deviceName,
        deviceType: userPasskeys.deviceType,
        backedUp: userPasskeys.backedUp,
        createdAt: userPasskeys.createdAt,
      });

    return NextResponse.json({ ok: true, passkey: created });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "This passkey is already registered" }, { status: 409 });
    }
    console.error("[passkey register insert]", e);
    return NextResponse.json({ error: "Could not save passkey" }, { status: 500 });
  }
}
