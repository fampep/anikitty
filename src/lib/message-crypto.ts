import crypto from "crypto";
import { isProduction } from "@/lib/security";

const ALGO = "aes-256-gcm";
const ENCRYPTED_PREFIX = "enc1:";

function encryptionKey(): Buffer {
  const material =
    process.env.MESSAGE_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    "dev-secret-change-in-production-please";
  return crypto.createHash("sha256").update(material).digest();
}

function encryptPayload(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptPayload(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Encrypt message text for storage. Empty strings are stored as-is. */
export function encryptStoredMessage(plaintext: string): string {
  if (!plaintext) return plaintext;
  return `${ENCRYPTED_PREFIX}${encryptPayload(plaintext)}`;
}

/** Decrypt stored message text. Legacy plaintext rows pass through unchanged. */
export function decryptStoredMessage(stored: string): string {
  if (!stored) return stored;
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored;
  try {
    return decryptPayload(stored.slice(ENCRYPTED_PREFIX.length));
  } catch {
    return "[Message unavailable]";
  }
}

export function assertMessageEncryptionConfigured(): string | null {
  if (!isProduction()) return null;
  const key = process.env.MESSAGE_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!key || key.length < 32) {
    return "Set MESSAGE_ENCRYPTION_KEY (32+ chars) or a strong JWT_SECRET for encrypted messages.";
  }
  const lower = key.toLowerCase();
  if (lower.includes("dev-secret") || lower.includes("change-in-production")) {
    return "Set MESSAGE_ENCRYPTION_KEY (32+ chars) for encrypted messages in production.";
  }
  return null;
}
