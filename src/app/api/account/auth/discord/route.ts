import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";
import { BOOSTER_ROLE } from "@/lib/social/booster-config";

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [existing] = await db
    .select({
      role: users.role,
      discordBoosting: users.discordBoosting,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  const wasBoosting =
    !!existing?.discordBoosting || existing?.role === BOOSTER_ROLE;

  await db
    .update(users)
    .set({
      discordId: null,
      discordUsername: null,
      discordBoosting: false,
      ...(existing?.role === BOOSTER_ROLE ? { role: "user" } : {}),
    })
    .where(eq(users.id, payload.userId));

  if (wasBoosting) {
    const { notifyDiscordRoleSync } = await import("@/lib/bot/notify-discord-sync");
    notifyDiscordRoleSync("discord_unlinked");
  }

  return NextResponse.json({ ok: true });
}
