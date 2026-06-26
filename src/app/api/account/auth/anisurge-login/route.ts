import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const ANISURGE_BFF = "https://db.anisurge.qzz.io/v1";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier?.trim() || !password)
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });

    // Authenticate with the real Anisurge BFF (server-side, no CORS issues)
    const bffRes = await fetch(`${ANISURGE_BFF}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    if (!bffRes.ok) {
      const body = await bffRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.error ?? "Invalid Anisurge credentials" },
        { status: bffRes.status === 401 ? 401 : 400 },
      );
    }

    const bffData = await bffRes.json();
    const anisurgeUser = bffData.user ?? {};
    const anisurgeId: string = bffData.anisurgeUserId ?? anisurgeUser.externalUserId ?? "";
    const anisurgeUsername: string = anisurgeUser.username ?? identifier.trim();
    const anisurgeEmail: string = (anisurgeUser.email ?? "").toLowerCase() || `${anisurgeUsername}@anisurge.account`;
    const avatarUrl: string | null = anisurgeUser.customPfpUrl ?? anisurgeUser.avatarUrl ?? null;

    const db = getDb();

    // Try to find an existing local account by email first, then by username
    let [existing] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, anisurgeEmail), eq(users.username, anisurgeUsername)))
      .limit(1);

    if (existing) {
      // Update avatar if it changed
      if (avatarUrl && avatarUrl !== existing.avatarUrl) {
        await db.update(users).set({ avatarUrl }).where(eq(users.id, existing.id));
        existing = { ...existing, avatarUrl };
      }
    } else {
      // No local account — create one linked to this Anisurge identity.
      // passwordHash is a random sentinel so they can't log in via normal login with it.
      const safeName = anisurgeUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25) || "user";

      // Handle username conflict with a different email (rare but possible)
      let finalUsername = safeName;
      const [nameConflict] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, safeName))
        .limit(1);
      if (nameConflict) {
        finalUsername = `${safeName}${anisurgeId.slice(-4)}`;
      }

      const passwordHash = await bcrypt.hash(
        `anisurge_sso:${anisurgeId}:${Date.now()}`,
        10,
      );

      [existing] = await db
        .insert(users)
        .values({
          username: finalUsername,
          email: anisurgeEmail,
          passwordHash,
          avatarUrl,
        })
        .returning();
    }

    const token = await signToken({
      userId: existing.id,
      username: existing.username,
      role: existing.role ?? "user",
    });

    return NextResponse.json({
      anisurgeToken: token,
      anisurgeUserId: existing.id,
      user: {
        username: existing.username,
        email: existing.email,
        avatarUrl: existing.avatarUrl ?? null,
        bannerUrl: existing.bannerUrl ?? null,
        bio: existing.bio ?? null,
        themeColor: existing.themeColor ?? null,
        role: existing.role ?? "user",
      },
    });
  } catch (e: any) {
    console.error("[anisurge-login]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
