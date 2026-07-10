import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { eq } from "drizzle-orm";
import {
  ACTIVITY_STATUSES,
  isValidActivityStatus,
  resolvePublicPresence,
  type ActivityStatus,
} from "@/lib/user/presence";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [row] = await db
    .select({
      activityStatus: users.activityStatus,
      lastOnlineAt: users.lastOnlineAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activityStatus = (row.activityStatus ?? "online") as ActivityStatus;
  const presence = resolvePublicPresence({
    activityStatus,
    lastOnlineAt: row.lastOnlineAt,
    forOwner: true,
  });

  return NextResponse.json({
    activityStatus,
    presenceStatus: presence.status,
    lastOnlineAt: row.lastOnlineAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    options: ACTIVITY_STATUSES,
  });
}

export async function PATCH(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { activityStatus } = body ?? {};

    if (!isValidActivityStatus(activityStatus)) {
      return NextResponse.json({ error: "Invalid activity status" }, { status: 400 });
    }

    const db = getDb();
    const [row] = await db
      .update(users)
      .set({
        activityStatus,
        ...(activityStatus === "online" ? { lastOnlineAt: new Date() } : {}),
      })
      .where(eq(users.id, payload.userId))
      .returning({
        activityStatus: users.activityStatus,
        lastOnlineAt: users.lastOnlineAt,
      });

    const presence = resolvePublicPresence({
      activityStatus: row.activityStatus,
      lastOnlineAt: row.lastOnlineAt,
      forOwner: true,
    });

    return NextResponse.json({
      activityStatus: row.activityStatus,
      presenceStatus: presence.status,
      lastOnlineAt: row.lastOnlineAt?.toISOString() ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
