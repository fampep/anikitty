import { getDb } from "@/db";
import { announcements } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";

// Public — past + present warn/critical announcements as a status-page
// incident log (reuses the existing announcements table; no separate
// incident schema). Resolved = isActive false or endsAt already passed.
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        severity: announcements.severity,
        isActive: announcements.isActive,
        startsAt: announcements.startsAt,
        endsAt: announcements.endsAt,
        createdAt: announcements.createdAt,
      })
      .from(announcements)
      .where(inArray(announcements.severity, ["warn", "critical"]))
      .orderBy(desc(announcements.createdAt))
      .limit(20);

    const now = Date.now();
    const incidents = rows.map((r) => {
      const endsAt = r.endsAt ? new Date(r.endsAt).getTime() : null;
      const resolved = !r.isActive || (endsAt != null && endsAt < now);
      return { ...r, resolved };
    });

    return Response.json(
      { incidents },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  } catch {
    return Response.json({ incidents: [] });
  }
}
