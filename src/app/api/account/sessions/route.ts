import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth-jwt";
import {
  listUserSessions,
  revokeOtherSessions,
  revokeSessions,
} from "@/lib/user-sessions";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await listUserSessions(payload.userId, payload.sessionId);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel ?? "Unknown device",
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt?.toISOString() ?? null,
      createdAt: s.createdAt?.toISOString() ?? null,
      current: s.current,
    })),
  });
}

export async function DELETE(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`sessions-revoke:${payload.userId}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { sessionIds, allOthers } = body as {
    sessionIds?: string[];
    allOthers?: boolean;
  };

  if (allOthers) {
    if (!payload.sessionId) {
      return NextResponse.json({ error: "Current session cannot be identified" }, { status: 400 });
    }
    const revoked = await revokeOtherSessions(payload.userId, payload.sessionId);
    return NextResponse.json({ ok: true, revoked, currentRevoked: false });
  }

  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return NextResponse.json({ error: "Select at least one session to sign out" }, { status: 400 });
  }

  if (sessionIds.length > 50) {
    return NextResponse.json({ error: "Cannot revoke more than 50 sessions at once" }, { status: 400 });
  }

  const uniqueIds = [...new Set(sessionIds.filter((id) => typeof id === "string" && id.length > 0))];
  const { revoked } = await revokeSessions(payload.userId, uniqueIds);
  const currentRevoked = !!payload.sessionId && revoked.includes(payload.sessionId);

  return NextResponse.json({ ok: true, revoked, currentRevoked });
}
