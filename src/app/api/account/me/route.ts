import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, username: users.username, email: users.email, avatarUrl: users.avatarUrl, bannerUrl: users.bannerUrl, bio: users.bio, role: users.role })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    anisurgeUserId: user.id,
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, bannerUrl: user.bannerUrl ?? null, bio: user.bio ?? null, role: user.role ?? "user" },
  });
}

export async function PUT(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { avatarUrl, bannerUrl, bio } = await req.json();
    const db = getDb();

    const [user] = await db
      .update(users)
      .set({
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ?? null }),
        ...(bannerUrl !== undefined && { bannerUrl: bannerUrl ?? null }),
        ...(bio !== undefined && { bio: bio ? String(bio).slice(0, 200) : null }),
      })
      .where(eq(users.id, payload.userId))
      .returning({ id: users.id, username: users.username, email: users.email, avatarUrl: users.avatarUrl, bannerUrl: users.bannerUrl, bio: users.bio });

    return NextResponse.json({
      anisurgeUserId: user.id,
      user: { username: user.username, email: user.email, avatarUrl: user.avatarUrl ?? null, bannerUrl: user.bannerUrl ?? null, bio: user.bio ?? null },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
