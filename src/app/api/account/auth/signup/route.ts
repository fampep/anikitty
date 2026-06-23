import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });

    if (!/^[a-zA-Z0-9_]{3,25}$/.test(username))
      return NextResponse.json(
        { error: "Username must be 3–25 characters: letters, numbers, underscores only" },
        { status: 400 },
      );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const db = getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email.toLowerCase())))
      .limit(1);

    if (existing.length > 0)
      return NextResponse.json({ error: "Username or email is already taken" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({ username, email: email.toLowerCase(), passwordHash })
      .returning({ id: users.id, username: users.username, email: users.email, avatarUrl: users.avatarUrl });

    const token = await signToken({ userId: user.id, username: user.username });

    return NextResponse.json({
      anisurgeToken: token,
      anisurgeUserId: user.id,
      user: { username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, customPfpUrl: null },
    });
  } catch (e: any) {
    console.error("[signup]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
