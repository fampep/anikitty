import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username?.trim() || !email?.trim() || !password)
      return NextResponse.json({ error: "Username, email and password are required" }, { status: 400 });

    if (!/^[a-zA-Z0-9_]{3,25}$/.test(username.trim()))
      return NextResponse.json({ error: "Username must be 3–25 characters (letters, numbers, underscore)" }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const db = getDb();
    const [conflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(
        eq(users.email, email.trim().toLowerCase()),
        eq(users.username, username.trim()),
      ))
      .limit(1);

    if (conflict)
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
      })
      .returning();

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role ?? "user",
    });

    return NextResponse.json({
      token,
      anisurgeToken: token,
      anisurgeUserId: user.id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        bannerUrl: user.bannerUrl ?? null,
        bio: user.bio ?? null,
        role: user.role ?? "user",
      },
    });
  } catch (e) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
