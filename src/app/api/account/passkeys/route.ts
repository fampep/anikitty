import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { userPasskeys } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const db = getDb();
  const rows = await db
    .select({
      id: userPasskeys.id,
      deviceName: userPasskeys.deviceName,
      deviceType: userPasskeys.deviceType,
      backedUp: userPasskeys.backedUp,
      lastUsedAt: userPasskeys.lastUsedAt,
      createdAt: userPasskeys.createdAt,
    })
    .from(userPasskeys)
    .where(eq(userPasskeys.userId, user.id))
    .orderBy(asc(userPasskeys.createdAt));

  return NextResponse.json({ passkeys: rows });
}
