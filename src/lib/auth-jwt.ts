import { SignJWT, jwtVerify } from "jose";
import { readAuthCookie } from "@/lib/auth-cookie";
import { isSessionActive, touchSession } from "@/lib/user-sessions";
import { assertAuthSecretsConfigured } from "@/lib/security";

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-production-please");

export type AuthPayload = {
  userId: string;
  username: string;
  role: string;
  sessionId?: string;
};

export async function signToken(payload: {
  userId: string;
  username: string;
  role: string;
  sessionId: string;
}) {
  const misconfigured = assertAuthSecretsConfigured();
  if (misconfigured) throw new Error(misconfigured);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(await secret());
}

export type OAuthPurpose = "anilist_oauth" | "discord_login" | "discord_link";

export async function signOAuthStateFor(
  purpose: OAuthPurpose,
  userId?: string,
): Promise<string> {
  return new SignJWT({ purpose, ...(userId ? { userId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(await secret());
}

export async function verifyOAuthStateFor(
  state: string,
  expectedPurpose: OAuthPurpose,
): Promise<{ userId?: string } | null> {
  try {
    const { payload } = await jwtVerify(state, await secret());
    if (payload.purpose !== expectedPurpose) return null;
    const userId = payload.userId as string | undefined;
    return userId ? { userId } : {};
  } catch {
    return null;
  }
}

export async function signOAuthState(userId: string): Promise<string> {
  return signOAuthStateFor("anilist_oauth", userId);
}

export async function verifyOAuthState(state: string): Promise<string | null> {
  const result = await verifyOAuthStateFor(state, "anilist_oauth");
  return result?.userId ?? null;
}

export async function sign2faPendingToken(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: "2fa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(await secret());
}

export async function verify2faPendingToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    if (payload.purpose !== "2fa_pending") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function decodeAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    if (payload.purpose) return null;
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  if (assertAuthSecretsConfigured()) return null;

  const payload = await decodeAuthToken(token);
  if (!payload) return null;

  if (payload.sessionId) {
    const active = await isSessionActive(payload.sessionId);
    if (!active) return null;
    await touchSession(payload.sessionId);
  }

  return payload;
}

export function extractToken(req: Request): string | null {
  const cookieToken = readAuthCookie(req);
  if (cookieToken) return cookieToken;

  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
