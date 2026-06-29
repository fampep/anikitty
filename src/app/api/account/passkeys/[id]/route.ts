import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userPasskeys } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Passkey id is required" }, { status: 400 });
  }

  const limited = checkRateLimit(`passkey-delete:${user.id}`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const db = getDb();
  const [deleted] = await db
    .delete(userPasskeys)
    .where(and(eq(userPasskeys.id, id), eq(userPasskeys.userId, user.id)))
    .returning({ id: userPasskeys.id });

  if (!deleted) {
    return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
