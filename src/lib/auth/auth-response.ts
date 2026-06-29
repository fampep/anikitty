import { createSession } from "@/lib/user/user-sessions";
import { signToken } from "@/lib/auth/auth-jwt";
import { getDb } from "@/db";
import { getRolePermissions } from "@/lib/security/permissions";

type UserRow = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  themeColor: string | null;
  role: string | null;
};

export async function buildAuthResponse(user: UserRow, req: Request) {
  const session = await createSession(user.id, req);
  let token: string;
  try {
    token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role ?? "user",
      sessionId: session.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Authentication misconfigured";
    throw new Error(message);
  }

  const role = user.role ?? "user";
  const db = getDb();
  const permissions = await getRolePermissions(db, role);

  return {
    anisurgeToken: token,
    anisurgeUserId: user.id,
    permissions,
    user: {
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      bannerUrl: user.bannerUrl ?? null,
      bio: user.bio ?? null,
      themeColor: user.themeColor ?? null,
      role,
    },
  };
}
