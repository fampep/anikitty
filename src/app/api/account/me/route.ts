import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { eq } from "drizzle-orm";
import { isSafeHttpsUrl } from "@/lib/security";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      bannerUrl: users.bannerUrl,
      bio: users.bio,
      role: users.role,
      anisurgeUsername: users.anisurgeUsername,
      anilistUsername: users.anilistUsername,
      anilistAccessToken: users.anilistAccessToken,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { anilistAccessToken: _token, ...safeUser } = user;

  return NextResponse.json({
    anisurgeUserId: safeUser.id,
    anisurgeLinked: !!safeUser.anisurgeUsername,
    anisurgeUsername: safeUser.anisurgeUsername ?? null,
    anilistLinked: !!_token,
    anilistUsername: safeUser.anilistUsername ?? null,
    user: {
      id: safeUser.id,
      username: safeUser.username,
      email: safeUser.email,
      avatarUrl: safeUser.avatarUrl ?? null,
      bannerUrl: safeUser.bannerUrl ?? null,
      bio: safeUser.bio ?? null,
      role: safeUser.role ?? "user",
      createdAt: safeUser.createdAt?.toISOString() ?? null,
    },
  });
}

export async function PUT(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { avatarUrl, bannerUrl, bio } = await req.json();

    if (!isSafeHttpsUrl(avatarUrl) || !isSafeHttpsUrl(bannerUrl)) {
      return NextResponse.json({ error: "Avatar and banner URLs must use HTTPS" }, { status: 400 });
    }

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
