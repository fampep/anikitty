import { SignJWT, jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-production-please");

export async function signToken(payload: { userId: string; username: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(await secret());
}

export async function signOAuthState(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: "anilist_oauth" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(await secret());
}

export async function verifyOAuthState(state: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, await secret());
    if (payload.purpose !== "anilist_oauth") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; username: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    return payload as { userId: string; username: string; role: string };
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
