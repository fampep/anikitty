import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { w2gRooms, w2gMembers } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { normalizeW2gCode } from "@/lib/w2g-code";
import { getRoomByCode, getRoomPayload } from "@/lib/w2g-server";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeW2gCode(rawCode);
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const data = await getRoomPayload(code, payload?.userId);
  if (!data) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (payload?.userId && data.isMember) {
    const db = getDb();
    const room = await getRoomByCode(code);
    if (room) {
      await db
        .update(w2gMembers)
        .set({ lastSeenAt: new Date() })
        .where(and(eq(w2gMembers.roomId, room.id), eq(w2gMembers.userId, payload.userId)));
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeW2gCode(rawCode);
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const room = await getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isHost = room.hostUserId === payload.userId;

  if (isHost) {
    const remaining = await db
      .select({ userId: w2gMembers.userId })
      .from(w2gMembers)
      .where(eq(w2gMembers.roomId, room.id));

    const others = remaining.filter((m) => m.userId !== payload.userId);

    if (others.length === 0) {
      await db.delete(w2gRooms).where(eq(w2gRooms.id, room.id));
      return NextResponse.json({ ok: true, closed: true });
    }

    await db
      .delete(w2gMembers)
      .where(and(eq(w2gMembers.roomId, room.id), eq(w2gMembers.userId, payload.userId)));

    await db
      .update(w2gRooms)
      .set({ hostUserId: others[0].userId, updatedAt: new Date() })
      .where(eq(w2gRooms.id, room.id));

    return NextResponse.json({ ok: true, closed: false, transferred: true });
  }

  await db
    .delete(w2gMembers)
    .where(and(eq(w2gMembers.roomId, room.id), eq(w2gMembers.userId, payload.userId)));

  return NextResponse.json({ ok: true, closed: false });
}
