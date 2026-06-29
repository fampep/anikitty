import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, unauthorized } from "@/lib/require-user";
import {
  buildOtpAuthUrl,
  encryptTotpSecret,
  createTotpSecret,
  qrDataUrlForOtpAuth,
} from "@/lib/totp";
import { ensureDataEncryptionKey } from "@/lib/data-encryption-key";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const limited = checkRateLimit(`2fa-setup:${user.id}`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  if (user.totpEnabled) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 });
  }

  const secret = createTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrDataUrl = await qrDataUrlForOtpAuth(otpauthUrl);

  await ensureDataEncryptionKey();

  const db = getDb();
  await db
    .update(users)
    .set({ totpSecret: encryptTotpSecret(secret), totpEnabled: false })
    .where(eq(users.id, user.id));

  return NextResponse.json({
    secret,
    otpauthUrl,
    qrDataUrl,
  });
}
