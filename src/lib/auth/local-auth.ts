import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,25}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

/** Synthetic emails for Discord/passphrase accounts — not usable for password reset. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@discord.account") ||
    normalized.endsWith("@anikitty.local") ||
    normalized.endsWith("@kitty.pw") ||
    /^discord_\d+@/.test(normalized)
  );
}

export function canReceiveAccountEmail(
  email: string | null | undefined,
  emailVerifiedAt: Date | string | null | undefined,
): boolean {
  if (!email || isPlaceholderEmail(email)) return false;
  return !!emailVerifiedAt;
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    return "Username must be 3–25 characters (letters, numbers, underscore)";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LEN) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const db = getDb();
  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }
  const [user] = await db.select().from(users).where(eq(users.username, trimmed)).limit(1);
  return user ?? null;
}

export async function verifyUserPassword(
  user: { passwordHash: string },
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function findSignupConflict(username: string, email: string) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const [existing] = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, normalizedEmail), eq(users.username, normalizedUsername)))
    .limit(1);
  return existing ?? null;
}
