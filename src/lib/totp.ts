import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ALGO = "aes-256-gcm";
const APP_NAME = "AniKitty";

function encryptionKey(): Buffer {
  const material =
    process.env.TOTP_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    "dev-secret-change-in-production-please";
  return crypto.createHash("sha256").update(material).digest();
}

export function encryptTotpSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptTotpSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
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
