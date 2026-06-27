import { SignJWT, jwtVerify } from "jose";
import { isAdminJwtSecretSecure, isProduction } from "@/lib/security";

const adminSecret = () =>
  new TextEncoder().encode(
    process.env.ADMIN_JWT_SECRET ?? "admin-dev-secret-change-in-production"
  );

export async function signAdminToken() {
  if (isProduction() && !isAdminJwtSecretSecure()) {
    throw new Error("ADMIN_JWT_SECRET is not configured securely");
  }

  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(await adminSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  if (isProduction() && !isAdminJwtSecretSecure()) return false;

  try {
    const { payload } = await jwtVerify(token, await adminSecret());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export function extractAdminToken(req: Request): string | null {
  return req.headers.get("X-Admin-Token") ?? null;
}

export async function requireAdmin(req: Request): Promise<boolean> {
  const token = extractAdminToken(req);
  if (!token) return false;
  return verifyAdminToken(token);
}
