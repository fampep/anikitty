import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ANISURGE_BFF = "https://db.anisurge.qzz.io/v1";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username?.trim() || !email?.trim() || !password)
      return NextResponse.json({ error: "Username, email and password are required" }, { status: 400 });

    if (!/^[a-zA-Z0-9]{3,10}$/.test(username.trim()))
      return NextResponse.json({ error: "Username must be 3–10 alphanumeric characters" }, { status: 400 });

    const bffRes = await fetch(`${ANISURGE_BFF}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    });

    if (!bffRes.ok) {
      const body = await bffRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.error ?? "Signup failed" },
        { status: bffRes.status === 409 ? 409 : 400 },
      );
    }

    const bffData = await bffRes.json();
    const anisurgeUser = bffData.user ?? {};
    const anisurgeId: string = bffData.anisurgeUserId ?? anisurgeUser.externalUserId ?? "";
    const anisurgeUsername: string = anisurgeUser.username ?? username.trim();
    const anisurgeEmail: string = (anisurgeUser.email ?? email.trim()).toLowerCase();
    const avatarUrl: string | null = anisurgeUser.customPfpUrl ?? anisurgeUser.avatarUrl ?? null;

    const db = getDb();

    let [existing] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, anisurgeEmail), eq(users.username, anisurgeUsername)))
      .limit(1);

    if (!existing) {
      const passwordHash = await bcrypt.hash(
        `anisurge_sso:${anisurgeId}:${Date.now()}`,
        10,
      );
      [existing] = await db
        .insert(users)
        .values({ username: anisurgeUsername, email: anisurgeEmail, passwordHash, avatarUrl })
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
        role: existing.role ?? "user",
      },
    });
  } catch (e: any) {
    console.error("[anisurge-signup]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
