import { eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings, users } from "@/db/schema";
import { ensureDataEncryptionKey } from "@/lib/data-encryption-key";
import { decryptTotpSecret, decryptTotpSecretForUser } from "@/lib/totp";

const ONE_TIME_RESET_FLAG = "2fa_reactive_reset_v1";

async function disableUserTwoFactor(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false })
    .where(eq(users.id, userId));
}

/** True when 2FA is enabled and the stored secret decrypts with the current key. */
export async function shouldPromptForTwoFactor(
  userId: string,
  totpEnabled: boolean,
  totpSecret: string | null,
): Promise<boolean> {
  if (!totpEnabled || !totpSecret) return false;
  await ensureDataEncryptionKey();
  const result = await decryptTotpSecretForUser(userId, totpSecret);
  return result.ok;
}

/** Drop 2FA rows that cannot be decrypted (reactive — runs on server boot). */
async function purgeUnusableTwoFactorSecrets(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(or(eq(users.totpEnabled, true), isNotNull(users.totpSecret)));

  let cleared = 0;
  for (const row of rows) {
    if (!row.totpSecret) {
      if (row.totpEnabled) {
        await disableUserTwoFactor(row.id);
        cleared++;
      }
      continue;
    }
    try {
      decryptTotpSecret(row.totpSecret);
    } catch {
      await disableUserTwoFactor(row.id);
      cleared++;
    }
  }
  return cleared;
}

/**
 * One-time global 2FA reset after encryption-key migration, plus reactive purge on
 * every boot so users are never locked out by stale secrets.
 */
export async function runReactiveTwoFactorMaintenance(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  await ensureDataEncryptionKey();
  const db = getDb();

  const [resetDone] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, ONE_TIME_RESET_FLAG))
    .limit(1);

  if (!resetDone) {
    await db.update(users).set({ totpSecret: null, totpEnabled: false });
    await db
      .insert(appSettings)
      .values({ key: ONE_TIME_RESET_FLAG, value: new Date().toISOString() })
      .onConflictDoNothing();
    console.info("[2fa-reactive] one-time global 2FA reset completed");
  }

  const cleared = await purgeUnusableTwoFactorSecrets();
  if (cleared > 0) {
    console.info(`[2fa-reactive] cleared ${cleared} unusable 2FA record(s)`);
  }
}
