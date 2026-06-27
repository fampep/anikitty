import { NextResponse } from "next/server";
import { decodeAuthToken, extractToken } from "@/lib/auth-jwt";
import { revokeSessionById } from "@/lib/user-sessions";

export async function POST(req: Request) {
  const token = extractToken(req);
  if (token) {
    const payload = await decodeAuthToken(token);
    if (payload?.sessionId) {
      await revokeSessionById(payload.userId, payload.sessionId);
    }
  }

  return NextResponse.json({ ok: true });
}
