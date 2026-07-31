import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";
import { isSafeHttpsUrl } from "@/lib/security/security";
import { PROFILE_BIO_MAX_LENGTH } from "@/lib/text/bbcode";
import { isValidThemeColor, normalizeThemeColor } from "@/lib/core/theme-color";
import { getRolePermissions } from "@/lib/security/permissions";
import { expireSupporterIfNeeded } from "@/lib/social/supporter-access";
import { getUserCosmetics } from "@/lib/shop/kittycoins";
import { isPlaceholderEmail } from "@/lib/auth/local-auth";

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
      themeColor: users.themeColor,
      role: users.role,
      supporterUntil: users.supporterUntil,
      discordBoosting: users.discordBoosting,
      anilistUsername: users.anilistUsername,
      anilistAccessToken: users.anilistAccessToken,
      discordId: users.discordId,
      discordUsername: users.discordUsername,
      totpEnabled: users.totpEnabled,
      profilePrivate: users.profilePrivate,
      bannedAt: users.bannedAt,
      banReason: users.banReason,
      mutedUntil: users.mutedUntil,
      muteReason: users.muteReason,
      createdAt: users.createdAt,
      lastOnlineAt: users.lastOnlineAt,
      activityStatus: users.activityStatus,
      passwordSetAt: users.passwordSetAt,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const effectiveRole = await expireSupporterIfNeeded(db, {
    id: user.id,
    role: user.role ?? "user",
    supporterUntil: user.supporterUntil,
    discordBoosting: user.discordBoosting,
  });

  const permissions = await getRolePermissions(db, effectiveRole);
  const cosmetics = await getUserCosmetics(db, user.id);

  const { anilistAccessToken: _token, ...safeUser } = user;

  return NextResponse.json({
    userId: safeUser.id,
    permissions,
    supporterUntil: user.supporterUntil?.toISOString() ?? null,
    discordBoosting: !!user.discordBoosting,
    kittycoinBalance: cosmetics.balance,
    anilistLinked: !!_token,
    anilistUsername: safeUser.anilistUsername ?? null,
    discordLinked: !!safeUser.discordId,
    discordUsername: safeUser.discordUsername ?? null,
    totpEnabled: safeUser.totpEnabled ?? false,
    profilePrivate: safeUser.profilePrivate ?? false,
    passwordSet: !!safeUser.passwordSetAt,
    placeholderEmail: isPlaceholderEmail(safeUser.email),
    user: {
      id: safeUser.id,
      username: safeUser.username,
      email: safeUser.email,
      avatarUrl: safeUser.avatarUrl ?? null,
      bannerUrl: safeUser.bannerUrl ?? null,
      bio: safeUser.bio ?? null,
      themeColor: safeUser.themeColor ?? null,
      role: effectiveRole,
      supporterUntil: user.supporterUntil?.toISOString() ?? null,
      discordBoosting: !!user.discordBoosting,
      createdAt: safeUser.createdAt?.toISOString() ?? null,
      lastOnlineAt: safeUser.lastOnlineAt?.toISOString() ?? null,
      activityStatus: safeUser.activityStatus ?? "online",
      equippedFrame: cosmetics.equipped.frame,
      equippedSticker: cosmetics.equipped.sticker,
      equippedIcon: cosmetics.equipped.icon,
      passwordSet: !!safeUser.passwordSetAt,
      placeholderEmail: isPlaceholderEmail(safeUser.email),
    },
  });
}

export async function PUT(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { avatarUrl, bannerUrl, bio, themeColor } = await req.json();

    // Allow our own in-DB uploads (relative /api/uploads/... paths) as well as
    // safe external HTTPS URLs.
    const isAllowedMedia = (u: unknown): boolean =>
      typeof u === "string" && u.startsWith("/api/uploads/") ? true : isSafeHttpsUrl(u as string | null | undefined);

    if (!isAllowedMedia(avatarUrl) || !isAllowedMedia(bannerUrl)) {
      return NextResponse.json({ error: "Avatar and banner URLs must use HTTPS" }, { status: 400 });
    }

    if (themeColor !== undefined && themeColor !== null && !isValidThemeColor(themeColor)) {
      return NextResponse.json({ error: "Invalid theme color" }, { status: 400 });
    }

    const db = getDb();

    const [user] = await db
      .update(users)
      .set({
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ?? null }),
        ...(bannerUrl !== undefined && { bannerUrl: bannerUrl ?? null }),
        ...(bio !== undefined && { bio: bio ? String(bio).slice(0, PROFILE_BIO_MAX_LENGTH) : null }),
        ...(themeColor !== undefined && { themeColor: normalizeThemeColor(themeColor) }),
      })
      .where(eq(users.id, payload.userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        avatarUrl: users.avatarUrl,
        bannerUrl: users.bannerUrl,
        bio: users.bio,
        themeColor: users.themeColor,
      });

    return NextResponse.json({
      userId: user.id,
      user: {
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        bannerUrl: user.bannerUrl ?? null,
        bio: user.bio ?? null,
        themeColor: user.themeColor ?? null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
