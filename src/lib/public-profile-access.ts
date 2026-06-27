import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getUserByUsername, type PublicUserRow } from "@/lib/public-user";
import {
  canViewProfile,
  getOptionalViewerId,
  privateProfileResponse,
} from "@/lib/profile-privacy";
import { eq } from "drizzle-orm";

type ResolveResult =
  | { ok: false; response: NextResponse }
  | { ok: true; user: PublicUserRow; viewerId: string | null };

export async function resolveVisibleProfileUser(
  req: Request,
  username: string,
): Promise<ResolveResult> {
  const trimmed = decodeURIComponent(username ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const db = getDb();
  const user = await getUserByUsername(db, trimmed);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const viewerId = await getOptionalViewerId(req);
  if (!canViewProfile(user.profilePrivate, user.id, viewerId)) {
    return { ok: false, response: privateProfileResponse() };
  }

  return { ok: true, user, viewerId };
}

export async function requireVisibleProfileUser(
  req: Request,
  username: string,
): Promise<PublicUserRow | NextResponse> {
  const result = await resolveVisibleProfileUser(req, username);
  if (!result.ok) return result.response;
  return result.user;
}

export function publicUserFields(user: PublicUserRow) {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    themeColor: user.themeColor,
    role: user.role,
    roleColor: user.roleColor,
    createdAt: user.createdAt?.toISOString() ?? null,
    profilePrivate: user.profilePrivate,
  };
}

export async function getProfilePrivateForUser(userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ profilePrivate: users.profilePrivate })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.profilePrivate ?? false;
}
