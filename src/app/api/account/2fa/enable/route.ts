import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { decryptTotpSecretForUser, verifyTotpCode } from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const limited = checkRateLimit(`2fa-enable:${user.id}`, 10, 15 * 60 * 1000);
  if (limited) return limited;

  if (user.totpEnabled) {
    return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 });
  }

  if (!user.totpSecret) {
    return NextResponse.json({ error: "Start setup first" }, { status: 400 });
  }

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
  }

  const decrypted = await decryptTotpSecretForUser(user.id, user.totpSecret);
  if (!decrypted.ok) {
    return NextResponse.json({ error: decrypted.message }, { status: 400 });
  }

  if (!verifyTotpCode(decrypted.secret, String(code))) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
  }

  const db = getDb();
  await db
    .update(users)
    .set({ totpEnabled: true })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true, enabled: true });
}
