import { comments, userNotifications, users } from "@/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { getNotificationPrefsFor } from "@/lib/social/notification-prefs";

type Db = ReturnType<typeof getDb>;

const MENTION_RE = /@([A-Za-z0-9_]{2,32})/g;

function extractMentionUsernames(body: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) found.add(m[1].toLowerCase());
  return [...found].slice(0, 10);
}

/**
 * Fire-and-forget: notify @mentioned users, and the parent author on a reply.
 * The commenter is never notified about their own comment.
 */
export async function notifyCommentTargets(
  db: Db,
  opts: {
    actorUserId: string;
    actorUsername: string;
    commentId: string;
    parentId: string | null;
    body: string;
    linkUrl: string;
  },
): Promise<void> {
  const recipients = new Map<string, "mention" | "comment_reply">();

  // Parent author gets a reply notification.
  if (opts.parentId) {
    const [parent] = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, opts.parentId))
      .limit(1);
    if (parent && parent.userId !== opts.actorUserId) {
      recipients.set(parent.userId, "comment_reply");
    }
  }

  // Mentioned users get a mention notification (takes priority over reply).
  const usernames = extractMentionUsernames(opts.body);
  if (usernames.length > 0) {
    const mentioned = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(sql<string>`lower(${users.username})`, usernames),
          ne(users.id, opts.actorUserId),
        ),
      );
    for (const u of mentioned) recipients.set(u.id, "mention");
  }

  if (recipients.size === 0) return;

  // Respect each recipient's notification preferences.
  const prefs = await getNotificationPrefsFor(db, [...recipients.keys()]);
  for (const [userId, type] of [...recipients.entries()]) {
    const p = prefs.get(userId);
    if (!p) continue;
    if (type === "mention" && !p.mentions) recipients.delete(userId);
    if (type === "comment_reply" && !p.replies) recipients.delete(userId);
  }
  if (recipients.size === 0) return;

  const rows = [...recipients.entries()].map(([userId, type]) => ({
    userId,
    type,
    actorUserId: opts.actorUserId,
    title: opts.actorUsername,
    body:
      type === "mention"
        ? `mentioned you: ${opts.body.slice(0, 120)}`
        : `replied: ${opts.body.slice(0, 120)}`,
    linkUrl: opts.linkUrl,
    referenceType: "comment" as const,
    referenceId: opts.commentId,
  }));

  await db.insert(userNotifications).values(rows).catch(() => {});
}
