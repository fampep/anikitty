import { extractToken, verifyToken } from "@/lib/auth-jwt";
import { isStaffRole } from "@/lib/moderation";

export async function requireStaff(req: Request) {
  const token = extractToken(req);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !isStaffRole(payload.role)) return null;

  return payload;
}
