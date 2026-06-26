import { getDb } from "@/db";
import { announcements, forumThreads, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/admin/announcements/[id]/post-to-forum
// Creates (or refreshes) a pinned forum thread tied to the announcement.
// Author = oldest existing admin user. Fails with 400 if no admin user exists.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();

  const [ann] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!ann) return NextResponse.json({ error: "Announcement not found" }, { status: 404 });

  if (ann.forumThreadId) {
    // Already cross-posted — just verify it still exists and return it.
    const [existing] = await db
      .select({ id: forumThreads.id })
      .from(forumThreads)
      .where(eq(forumThreads.id, ann.forumThreadId))
      .limit(1);
    if (existing) {
      return NextResponse.json({ threadId: existing.id, alreadyPosted: true });
    }
    // Thread was deleted — clear the stale link and fall through to repost.
    await db
      .update(announcements)
      .set({ forumThreadId: null })
      .where(eq(announcements.id, id));
  }

  // Pick the oldest admin user as the thread author.
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.createdAt))
    .limit(1);

  if (!adminUser)
    return NextResponse.json(
      { error: "No admin user found. Promote a user to 'admin' role first." },
      { status: 400 },
    );

  // Compose the thread body.
  const body =
    ann.body && ann.body.trim().length > 0
      ? ann.body
      : "(See the site banner for the latest update.)";

  const [thread] = await db
    .insert(forumThreads)
    .values({
      userId: adminUser.id,
      title: ann.title,
      body,
      category: "announcements",
      isPinned: true,
    })
    .returning({ id: forumThreads.id });

  await db
    .update(announcements)
    .set({ forumThreadId: thread.id, updatedAt: new Date() })
    .where(eq(announcements.id, id));

  return NextResponse.json({ threadId: thread.id });
}
