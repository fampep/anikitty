import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";

import { BOOSTER_ROLE } from "@/lib/discord/bot-config";

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  await db
    .update(users)
    .set({
      discordId: null,
      discordUsername: null,
      discordBoostSince: null,
      ...(user?.role === BOOSTER_ROLE ? { role: "user" } : {}),
    })
    .where(eq(users.id, payload.userId));

  return NextResponse.json({ ok: true });
}
