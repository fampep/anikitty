import { NextResponse } from "next/server";
import { decodeAuthToken, extractToken } from "@/lib/auth/auth-jwt";
import { clearAuthCookie } from "@/lib/auth/auth-cookie";
import { revokeSessionById } from "@/lib/user/user-sessions";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (token) {
    const payload = await decodeAuthToken(token);
    if (payload?.sessionId) {
      await revokeSessionById(payload.userId, payload.sessionId);
    }
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookie(res);
  return res;
}
