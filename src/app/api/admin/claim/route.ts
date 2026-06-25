import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken, signToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";

const ADMIN_KEY = process.env.ADMIN_KEY ?? "";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_KEY) return NextResponse.json({ error: "Admin key not configured" }, { status: 500 });

  const { key } = await req.json().catch(() => ({}));
  if (!key || key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Invalid admin key" }, { status: 403 });
  }

  const db = getDb();
  await db.update(users).set({ role: "admin" }).where(eq(users.id, payload.userId));

  // Return a fresh token with the updated role
  const newToken = await signToken({ userId: payload.userId, username: payload.username, role: "admin" });

  return NextResponse.json({ ok: true, token: newToken, role: "admin" });
}
