import { getDb } from "@/db";
import {
  dmConversations,
  dmMessages,
  dmReadState,
  userNotifications,
  users,
} from "@/db/schema";
import { canViewProfile } from "@/lib/user/profile-privacy";
import { decryptStoredMessage, encryptStoredMessage } from "@/lib/security/message-crypto";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

export function canonicalPair(userA: string, userB: string): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}

export function isConversationParticipant(
  conv: { participantAId: string; participantBId: string },
  userId: string,
): boolean {
  return conv.participantAId === userId || conv.participantBId === userId;
}

export function otherParticipantId(
  conv: { participantAId: string; participantBId: string },
  userId: string,
): string {
  return conv.participantAId === userId ? conv.participantBId : conv.participantAId;
}

export async function findOrCreateConversation(userA: string, userB: string) {
  if (userA === userB) return null;
  const [a, b] = canonicalPair(userA, userB);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(dmConversations)
    .where(and(eq(dmConversations.participantAId, a), eq(dmConversations.participantBId, b)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(dmConversations)
    .values({ participantAId: a, participantBId: b })
    .returning();

  return created;
}

export async function canInitiateDm(
  senderId: string,
  target: { id: string; profilePrivate: boolean },
): Promise<boolean> {
  if (senderId === target.id) return false;
  return canViewProfile(target.profilePrivate, target.id, senderId);
}

export async function markConversationRead(conversationId: string, userId: string) {
  const db = getDb();
  const now = new Date();

  await db
    .insert(dmReadState)
    .values({ conversationId, userId, lastReadAt: now })
    .onConflictDoUpdate({
      target: [dmReadState.conversationId, dmReadState.userId],
      set: { lastReadAt: now },
    });

  await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.referenceType, "dm_conversation"),
        eq(userNotifications.referenceId, conversationId),
        isNull(userNotifications.readAt),
      ),
    );
}

export async function createDmNotification(opts: {
  recipientId: string;
  senderId: string;
  senderUsername: string;
  conversationId: string;
  preview: string;
}) {
  const db = getDb();
  const body = opts.preview.length > 120 ? `${opts.preview.slice(0, 120).trim()}…` : opts.preview;
  const storedBody = encryptStoredMessage(body || "Sent a message");

  await db.insert(userNotifications).values({
    userId: opts.recipientId,
    type: "dm",
    actorUserId: opts.senderId,
    title: opts.senderUsername,
    body: storedBody,
    linkUrl: `/messages?c=${opts.conversationId}`,
    referenceType: "dm_conversation",
    referenceId: opts.conversationId,
  });
}

export async function countUnreadDm(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(dmMessages)
    .innerJoin(dmConversations, eq(dmConversations.id, dmMessages.conversationId))
    .leftJoin(
      dmReadState,
      and(eq(dmReadState.conversationId, dmMessages.conversationId), eq(dmReadState.userId, userId)),
    )
    .where(
      and(
        or(eq(dmConversations.participantAId, userId), eq(dmConversations.participantBId, userId)),
        sql`${dmMessages.senderId} <> ${userId}`,
        or(
          isNull(dmReadState.lastReadAt),
          gt(dmMessages.createdAt, dmReadState.lastReadAt),
        ),
      ),
    );

  return row?.count ?? 0;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));

  return row?.count ?? 0;
}

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      profilePrivate: users.profilePrivate,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user ?? null;
}

export async function buildConversationSummary(
  conv: typeof dmConversations.$inferSelect,
  viewerId: string,
) {
  const db = getDb();
  const otherId = otherParticipantId(conv, viewerId);

  const [[other], [lastMsg], [readState]] = await Promise.all([
    db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, otherId))
      .limit(1),
    db
      .select({ body: dmMessages.body, gifUrl: dmMessages.gifUrl })
      .from(dmMessages)
      .where(eq(dmMessages.conversationId, conv.id))
      .orderBy(desc(dmMessages.createdAt))
      .limit(1),
    db
      .select({ lastReadAt: dmReadState.lastReadAt })
      .from(dmReadState)
      .where(and(eq(dmReadState.conversationId, conv.id), eq(dmReadState.userId, viewerId)))
      .limit(1),
  ]);

  let unreadWhere;
  if (readState?.lastReadAt) {
    unreadWhere = and(
      eq(dmMessages.conversationId, conv.id),
      sql`${dmMessages.senderId} <> ${viewerId}`,
      gt(dmMessages.createdAt, readState.lastReadAt),
    );
  } else {
    unreadWhere = and(
      eq(dmMessages.conversationId, conv.id),
      sql`${dmMessages.senderId} <> ${viewerId}`,
    );
  }

  const [unreadRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dmMessages)
    .where(unreadWhere);

  const preview = lastMsg?.body?.trim()
    ? decryptStoredMessage(lastMsg.body)
    : lastMsg?.gifUrl
      ? "GIF"
      : null;

  return {
    id: conv.id,
    otherUserId: otherId,
    otherUsername: other?.username ?? "user",
    otherAvatarUrl: other?.avatarUrl ?? null,
    lastMessage: preview,
    lastActivityAt: conv.lastActivityAt?.toISOString() ?? new Date().toISOString(),
    unreadCount: unreadRow?.count ?? 0,
  };
}
