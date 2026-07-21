import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  hashPassword,
  validatePassword,
  verifyUserPassword,
} from "@/lib/auth/local-auth";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";

/** Set or change password while signed in (enables email/password login for Discord accounts). */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limited = rateLimit(`set-password:${payload.userId}:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const password = typeof body.password === "string" ? body.password : "";
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Changing an existing password requires the current one.
    if (user.passwordSetAt) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 },
        );
      }
      if (!(await verifyUserPassword(user, currentPassword))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
      }
    }

    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, passwordSetAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ ok: true, passwordSet: true });
  } catch (e) {
    console.error("[set-password]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
