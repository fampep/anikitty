import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken, signToken } from "@/lib/auth-jwt";
import { createSession } from "@/lib/user-sessions";
import { eq } from "drizzle-orm";
import { safeEqual, isProduction } from "@/lib/security";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ADMIN_KEY = process.env.ADMIN_KEY ?? "";

export async function POST(req: Request) {
  if (isProduction() && !ADMIN_KEY) {
    return NextResponse.json({ error: "Admin claim is disabled" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limited = checkRateLimit(`admin-claim:${ip}`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ADMIN_KEY) return NextResponse.json({ error: "Admin key not configured" }, { status: 500 });

  const { key } = await req.json().catch(() => ({}));
  if (!key || !safeEqual(String(key), ADMIN_KEY)) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Invalid admin key" }, { status: 403 });
  }

  const db = getDb();
  await db.update(users).set({ role: "admin" }).where(eq(users.id, payload.userId));

  const sessionId =
    payload.sessionId ?? (await createSession(payload.userId, req)).id;

  const newToken = await signToken({
    userId: payload.userId,
    username: payload.username,
    role: "admin",
    sessionId,
  });

  return NextResponse.json({ ok: true, token: newToken, role: "admin" });
}
