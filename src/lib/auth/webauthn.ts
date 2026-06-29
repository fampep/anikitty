import type { AuthenticatorTransportFuture, WebAuthnCredential } from "@simplewebauthn/server";
import type { userPasskeys } from "@/db/schema";

export function getWebAuthnOrigin(req?: Request): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN.replace(/\/$/, "");
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req?.headers.get("origin") ??
    (req ? new URL(req.url).origin : null) ??
    "http://localhost:3000";
  return origin.replace(/\/$/, "");
}

export function getWebAuthnRpId(req?: Request): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  try {
    return new URL(getWebAuthnOrigin(req)).hostname;
  } catch {
    return "localhost";
  }
}

export function getWebAuthnRpName(): string {
  return process.env.WEBAUTHN_RP_NAME ?? "AniKitty";
}

export function webAuthnUserId(userId: string): Uint8Array {
  return new Uint8Array(new TextEncoder().encode(userId));
}

export function parsePasskeyTransports(
  raw: string | null,
): AuthenticatorTransportFuture[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function passkeyRowToCredential(
  row: Pick<typeof userPasskeys.$inferSelect, "credentialId" | "publicKey" | "counter" | "transports">,
): WebAuthnCredential {
  return {
    id: row.credentialId,
    publicKey: Uint8Array.from(Buffer.from(row.publicKey, "base64")),
    counter: row.counter,
    transports: parsePasskeyTransports(row.transports),
  };
}

export function serializePasskeyTransports(
  transports: AuthenticatorTransportFuture[] | undefined,
): string | null {
  if (!transports?.length) return null;
  return JSON.stringify(transports);
}

export function defaultPasskeyDeviceName(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux device";
  return "This device";
}
