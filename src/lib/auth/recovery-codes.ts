import { createHash, randomInt } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userRecoveryCodes } from "@/db/schema";

export const RECOVERY_CODE_COUNT = 8;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function pepper(): string {
  return process.env.JWT_SECRET ?? "dev-secret-change-in-production-please";
}

/** Normalize user input: strip spaces/dashes, uppercase. */
export function normalizeRecoveryCode(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

/** Display form XXXX-XXXX. */
export function formatRecoveryCode(normalized: string): string {
  const clean = normalizeRecoveryCode(normalized);
  if (clean.length !== 8) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

function generatePlainCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]!;
  }
  return formatRecoveryCode(out);
}

export function hashRecoveryCode(raw: string): string {
  const normalized = normalizeRecoveryCode(raw);
  return createHash("sha256")
    .update(`${pepper()}:recovery:${normalized}`)
    .digest("hex");
}

/**
 * Replace all unused codes for a user with a fresh set.
 * Returns plaintext codes once — never stored.
 */
export async function issueRecoveryCodes(
  userId: string,
  count = RECOVERY_CODE_COUNT,
): Promise<string[]> {
  const db = getDb();
  const plains: string[] = [];
  const hashes = new Set<string>();

  while (plains.length < count) {
    const plain = generatePlainCode();
    const hash = hashRecoveryCode(plain);
    if (hashes.has(hash)) continue;
    hashes.add(hash);
    plains.push(plain);
  }

  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.userId, userId));
  await db.insert(userRecoveryCodes).values(
    plains.map((plain) => ({
      userId,
      codeHash: hashRecoveryCode(plain),
    })),
  );

  return plains;
}

export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userRecoveryCodes)
    .where(
      and(eq(userRecoveryCodes.userId, userId), isNull(userRecoveryCodes.usedAt)),
    );
  return row?.count ?? 0;
}

/**
 * Consume one unused recovery code for a user.
 * Returns true if a matching unused code was found and marked used.
 */
export async function consumeRecoveryCode(
  userId: string,
  rawCode: string,
): Promise<boolean> {
  const normalized = normalizeRecoveryCode(rawCode);
  if (normalized.length < 8) return false;

  const hash = hashRecoveryCode(normalized);
  const db = getDb();
  const [row] = await db
    .select({ id: userRecoveryCodes.id })
    .from(userRecoveryCodes)
    .where(
      and(
        eq(userRecoveryCodes.userId, userId),
        eq(userRecoveryCodes.codeHash, hash),
        isNull(userRecoveryCodes.usedAt),
      ),
    )
    .limit(1);

  if (!row) return false;

  await db
    .update(userRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(eq(userRecoveryCodes.id, row.id));

  return true;
}

/**
 * Find user by recovery code without username (slower — only for recover flow with username preferred).
 * Prefer looking up by username/email then consumeRecoveryCode.
 */
export async function findUserIdByUnusedRecoveryCode(
  rawCode: string,
): Promise<string | null> {
  const normalized = normalizeRecoveryCode(rawCode);
  if (normalized.length < 8) return null;
  const hash = hashRecoveryCode(normalized);
  const db = getDb();
  const [row] = await db
    .select({ userId: userRecoveryCodes.userId })
    .from(userRecoveryCodes)
    .where(
      and(eq(userRecoveryCodes.codeHash, hash), isNull(userRecoveryCodes.usedAt)),
    )
    .limit(1);
  return row?.userId ?? null;
}
