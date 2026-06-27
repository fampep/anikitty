import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";

export async function requireUser(req: Request) {
  const token = extractToken(req);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      totpSecret: users.totpSecret,
      totpEnabled: users.totpEnabled,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  return user ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
