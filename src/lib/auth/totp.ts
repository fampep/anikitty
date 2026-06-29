import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { encryptionKeyBuffer, ensureDataEncryptionKey } from "@/lib/security/data-encryption-key";

const ALGO = "aes-256-gcm";
const APP_NAME = "AniKitty";

export class TotpDecryptError extends Error {
  constructor(message = "Unable to decrypt two-factor secret") {
    super(message);
    this.name = "TotpDecryptError";
  }
}

export function encryptTotpSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKeyBuffer(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptTotpSecret(encoded: string): string {
  try {
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, encryptionKeyBuffer(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new TotpDecryptError();
  }
}

const TOTP_KEY_RESET_MESSAGE =
  "Two-factor authentication was reset after a server encryption key change. Sign in and set up 2FA again.";

/** Decrypt TOTP secret, or clear broken 2FA after a VPS/key rotation. */
export async function decryptTotpSecretForUser(
  userId: string,
  encoded: string,
): Promise<{ ok: true; secret: string } | { ok: false; message: string }> {
  await ensureDataEncryptionKey();
  try {
    return { ok: true, secret: decryptTotpSecret(encoded) };
  } catch {
    const db = getDb();
    await db
      .update(users)
      .set({ totpSecret: null, totpEnabled: false })
      .where(eq(users.id, userId));
    return { ok: false, message: TOTP_KEY_RESET_MESSAGE };
  }
}

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

export async function qrDataUrlForOtpAuth(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 200 });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = verifySync({
    secret,
    token: normalized,
    epochTolerance: 30,
  });
  return result.valid;
}
