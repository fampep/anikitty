import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser, unauthorized } from "@/lib/require-user";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotpCode(secret, String(code))) {
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
