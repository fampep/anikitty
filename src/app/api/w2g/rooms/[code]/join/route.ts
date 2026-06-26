import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { w2gMembers } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth-jwt";
import { normalizeW2gCode } from "@/lib/w2g-code";
import { getRoomByCode, getRoomPayload } from "@/lib/w2g-server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeW2gCode(rawCode);
  if (!code) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await getRoomByCode(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const db = getDb();
  await db
    .insert(w2gMembers)
    .values({ roomId: room.id, userId: payload.userId })
    .onConflictDoNothing();

  const data = await getRoomPayload(code, payload.userId);
  return NextResponse.json(data);
}
