import { NextResponse } from "next/server";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { countUnreadDm, countUnreadNotifications } from "@/lib/social/dm-server";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [unreadNotifications, unreadDm] = await Promise.all([
    countUnreadNotifications(payload.userId),
    countUnreadDm(payload.userId),
  ]);

  return NextResponse.json({
    unreadNotifications,
    unreadDm,
    totalUnread: unreadNotifications + unreadDm,
  });
}
