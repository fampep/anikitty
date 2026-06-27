import { createSession } from "@/lib/user-sessions";
import { signToken } from "@/lib/auth-jwt";

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

  return {
    anisurgeToken: token,
    anisurgeUserId: user.id,
    user: {
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      bannerUrl: user.bannerUrl ?? null,
      bio: user.bio ?? null,
      themeColor: user.themeColor ?? null,
      role: user.role ?? "user",
    },
  };
}
