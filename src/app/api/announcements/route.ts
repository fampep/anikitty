import { getDb } from "@/db";
import { announcements } from "@/db/schema";
import { and, eq, desc, or, isNull, lte, gte, sql } from "drizzle-orm";

// Public endpoint: returns currently active, in-window announcements.
// Used by the site-wide banner.
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();

    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        severity: announcements.severity,
        dismissible: announcements.dismissible,
        linkUrl: announcements.linkUrl,
        linkLabel: announcements.linkLabel,
        forumThreadId: announcements.forumThreadId,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
          or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
        ),
      )
      .orderBy(desc(announcements.createdAt))
      .limit(5);

    return Response.json(
      { announcements: rows },
      {
        // Briefly cache so the banner doesn't hammer the DB.
        headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
      },
    );
  } catch {
    // Table may not exist yet (migration not run). Don't crash the layout.
    return Response.json({ announcements: [] });
  }
}

// Silence unused import warning when table doesn't yet exist
void sql;
