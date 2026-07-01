import { createSession } from "@/lib/user/user-sessions";
import { signToken } from "@/lib/auth/auth-jwt";
import { getDb } from "@/db";
import { getRolePermissions } from "@/lib/security/permissions";
import { expireSupporterIfNeeded } from "@/lib/social/supporter-access";

type UserRow = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  themeColor: string | null;
  role: string | null;
  supporterUntil?: Date | null;
};

export async function buildAuthResponse(user: UserRow, req: Request) {
  const db = getDb();
  const effectiveRole = await expireSupporterIfNeeded(db, {
    id: user.id,
    role: user.role ?? "user",
    supporterUntil: user.supporterUntil ?? null,
  });

  const session = await createSession(user.id, req);
  let token: string;
  try {
    token = await signToken({
      userId: user.id,
      username: user.username,
      role: effectiveRole,
      sessionId: session.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Authentication misconfigured";
    throw new Error(message);
  }

  const permissions = await getRolePermissions(db, effectiveRole);

  return {
    anisurgeToken: token,
    anisurgeUserId: user.id,
    permissions,
    supporterUntil: user.supporterUntil?.toISOString() ?? null,
    user: {
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      bannerUrl: user.bannerUrl ?? null,
      bio: user.bio ?? null,
      themeColor: user.themeColor ?? null,
      role: effectiveRole,
      supporterUntil: user.supporterUntil?.toISOString() ?? null,
    },
  };
}
