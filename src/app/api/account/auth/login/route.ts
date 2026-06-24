import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth-jwt";
import { eq, or } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password)
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });

    const id = identifier.trim().toLowerCase();
    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.username, id), eq(users.email, id)))
      .limit(1);

    if (!user)
      return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });

    const token = await signToken({ userId: user.id, username: user.username, role: user.role ?? "user" });

    return NextResponse.json({
      anisurgeToken: token,
      anisurgeUserId: user.id,
      user: { username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, bannerUrl: user.bannerUrl ?? null, bio: user.bio ?? null, role: user.role ?? "user" },
    });
  } catch (e: any) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
