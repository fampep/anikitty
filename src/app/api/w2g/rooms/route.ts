import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { w2gRooms, w2gMembers } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { generateW2gCode } from "@/lib/social/w2g-code";
import { serializeRoom } from "@/lib/social/w2g-server";

const MAX_CREATE_ATTEMPTS = 5;

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json();
  const animeId = typeof raw.animeId === "string" ? raw.animeId.trim() : "";
  const episodeId = typeof raw.episodeId === "string" ? raw.episodeId.trim() : "";
  if (!animeId || !episodeId) {
    return NextResponse.json({ error: "animeId and episodeId required" }, { status: 400 });
  }

  const db = getDb();
  let room = null;

  for (let i = 0; i < MAX_CREATE_ATTEMPTS; i++) {
    const code = generateW2gCode();
    try {
      const [created] = await db
        .insert(w2gRooms)
        .values({
          code,
          hostUserId: payload.userId,
          animeId,
          animeTitle: typeof raw.animeTitle === "string" ? raw.animeTitle.slice(0, 300) : null,
          animeThumbnail:
            typeof raw.animeThumbnail === "string" ? raw.animeThumbnail.slice(0, 500) : null,
          episodeId,
          episodeNumber: Math.max(0, parseInt(String(raw.episodeNumber ?? 0)) || 0),
          provider: typeof raw.provider === "string" ? raw.provider.slice(0, 50) : "Miruro",
          audio: raw.audio === "dub" ? "dub" : "sub",
          isPlaying: false,
          currentTime: Math.max(0, Math.floor(Number(raw.currentTime) || 0)),
        })
        .returning();
      room = created;
      break;
    } catch {
      // code collision — retry
    }
  }

  if (!room) {
    return NextResponse.json({ error: "Could not create room" }, { status: 500 });
  }

  await db.insert(w2gMembers).values({
    roomId: room.id,
    userId: payload.userId,
  });

  return NextResponse.json(
    {
      room: serializeRoom(room),
      isHost: true,
      isMember: true,
    },
    { status: 201 },
  );
}
