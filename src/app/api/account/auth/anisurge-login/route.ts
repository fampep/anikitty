import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier?.trim() || !password)
      return NextResponse.json({ error: "Username/email and password are required" }, { status: 400 });

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(or(
        eq(users.email, identifier.trim().toLowerCase()),
        eq(users.username, identifier.trim()),
      ))
      .limit(1);

    if (!user)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

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
    console.error("[login]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
