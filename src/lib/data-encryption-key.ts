import crypto from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";

const SETTINGS_KEY = "data_encryption_key";

let cachedMaterial: string | null = null;
let initPromise: Promise<void> | null = null;

function pickEnvEncryptionMaterial(): string | null {
  for (const value of [
    process.env.DATA_ENCRYPTION_KEY,
    process.env.TOTP_ENCRYPTION_KEY,
    process.env.MESSAGE_ENCRYPTION_KEY,
  ]) {
    if (value && value.length >= 32) return value;
  }
  return null;
}

function devFallbackMaterial(): string {
  return (
    pickEnvEncryptionMaterial() ??
    process.env.JWT_SECRET ??
    "dev-secret-change-in-production-please"
  );
}

/** AES-256-GCM key derived from the persisted data encryption secret. */
export function encryptionKeyBuffer(): Buffer {
  const material = cachedMaterial ?? devFallbackMaterial();
  return crypto.createHash("sha256").update(material).digest();
}

/**
 * Load or create the data encryption key in Postgres so TOTP/chat crypto survives
 * VPS resets when DATABASE_URL points at the same database.
 */
export async function ensureDataEncryptionKey(): Promise<void> {
  if (cachedMaterial) return;
  if (!initPromise) initPromise = loadOrCreateKey();
  await initPromise;
}

async function loadOrCreateKey(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    cachedMaterial = devFallbackMaterial();
    return;
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEY))
      .limit(1);

    if (existing?.value) {
      cachedMaterial = existing.value;
      return;
    }

    const material = pickEnvEncryptionMaterial() ?? crypto.randomBytes(32).toString("base64");

    await db
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, value: material })
      .onConflictDoNothing();

    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEY))
      .limit(1);

    cachedMaterial = row?.value ?? material;
  } catch (err) {
    console.error("[data-encryption-key] failed to load from database:", err);
    cachedMaterial = devFallbackMaterial();
  }
}
