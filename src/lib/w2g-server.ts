import { getDb } from "@/db";
import { w2gRooms, w2gMembers, w2gMessages, users } from "@/db/schema";
import { decryptStoredMessage } from "@/lib/message-crypto";
import { eq, desc, asc } from "drizzle-orm";

export type W2gRoomRow = typeof w2gRooms.$inferSelect;

export function serializeRoom(room: W2gRoomRow) {
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    animeId: room.animeId,
    animeTitle: room.animeTitle,
    animeThumbnail: room.animeThumbnail,
    episodeId: room.episodeId,
    episodeNumber: room.episodeNumber,
    provider: room.provider,
    audio: room.audio as "sub" | "dub",
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    stateVersion: room.stateVersion,
    updatedAt: room.updatedAt?.toISOString() ?? null,
    createdAt: room.createdAt?.toISOString() ?? null,
  };
}

export async function getRoomByCode(code: string) {
  const db = getDb();
  const [room] = await db
    .select()
    .from(w2gRooms)
    .where(eq(w2gRooms.code, code))
    .limit(1);
  return room ?? null;
}

export async function getRoomPayload(code: string, viewerUserId?: string | null) {
  const room = await getRoomByCode(code);
  if (!room) return null;

  const db = getDb();
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);

  const [members, messages] = await Promise.all([
    db
      .select({
        userId: w2gMembers.userId,
        username: users.username,
        avatarUrl: users.avatarUrl,
        lastSeenAt: w2gMembers.lastSeenAt,
        joinedAt: w2gMembers.joinedAt,
      })
      .from(w2gMembers)
      .innerJoin(users, eq(users.id, w2gMembers.userId))
      .where(eq(w2gMembers.roomId, room.id))
      .orderBy(asc(w2gMembers.joinedAt)),
    db
      .select({
        id: w2gMessages.id,
        body: w2gMessages.body,
        createdAt: w2gMessages.createdAt,
        userId: w2gMessages.userId,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(w2gMessages)
      .innerJoin(users, eq(users.id, w2gMessages.userId))
      .where(eq(w2gMessages.roomId, room.id))
      .orderBy(desc(w2gMessages.createdAt))
      .limit(50),
  ]);

  messages.reverse();

  const isHost = viewerUserId === room.hostUserId;
  const isMember = viewerUserId
    ? members.some((m) => m.userId === viewerUserId)
    : false;

  return {
    room: serializeRoom(room),
    members: members.map((m) => ({
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatarUrl,
      isHost: m.userId === room.hostUserId,
      isOnline: (m.lastSeenAt?.getTime() ?? 0) > fiveMinAgo.getTime(),
      joinedAt: m.joinedAt?.toISOString() ?? null,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      body: decryptStoredMessage(m.body),
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatarUrl,
      createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    isHost,
    isMember,
  };
}
