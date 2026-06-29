import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { w2gRooms } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { normalizeW2gCode } from "@/lib/social/w2g-code";
import { getRoomByCode, serializeRoom } from "@/lib/social/w2g-server";
import { eq, sql } from "drizzle-orm";

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
  if (room.hostUserId !== payload.userId) {
    return NextResponse.json({ error: "Only the host can sync playback" }, { status: 403 });
  }

  const raw = await req.json();
  const isPlaying = typeof raw.isPlaying === "boolean" ? raw.isPlaying : room.isPlaying;
  const currentTime = Math.max(0, Math.floor(Number(raw.currentTime ?? room.currentTime)));

  const updates: Record<string, unknown> = {
    isPlaying,
    currentTime,
    updatedAt: new Date(),
    stateVersion: sql`${w2gRooms.stateVersion} + 1`,
  };

  if (typeof raw.episodeId === "string" && raw.episodeId.trim()) {
    updates.episodeId = raw.episodeId.trim();
    updates.episodeNumber = Math.max(0, parseInt(String(raw.episodeNumber ?? 0)) || 0);
  }
  if (typeof raw.provider === "string") updates.provider = raw.provider.slice(0, 50);
  if (raw.audio === "sub" || raw.audio === "dub") updates.audio = raw.audio;

  const db = getDb();
  const [updated] = await db
    .update(w2gRooms)
    .set(updates)
    .where(eq(w2gRooms.id, room.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Sync failed" }, { status: 500 });

  return NextResponse.json({ room: serializeRoom(updated) });
}
