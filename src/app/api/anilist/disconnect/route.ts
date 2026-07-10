import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  await db
    .update(users)
    .set({
      anilistAccessToken: null,
      anilistRefreshToken: null,
      anilistUserId: null,
      anilistUsername: null,
    })
    .where(eq(users.id, payload.userId));

  return NextResponse.json({ ok: true });
}
