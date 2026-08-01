import { getDb } from "@/db";
import { changelogEntries } from "@/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CHANGELOG_CATEGORIES, type ChangelogItem } from "@/lib/changelog/changelog-shared";

const PAGE_SIZE = 20;

// ── GET — public, published only. ?q=search&category=new&page=1 ─────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 100) || "";
  const category = searchParams.get("category")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const db = getDb();
  const conditions = [eq(changelogEntries.isPublished, true)];
  if (q) {
    conditions.push(
      or(
        ilike(changelogEntries.version, `%${q}%`),
        ilike(changelogEntries.title, `%${q}%`),
        ilike(changelogEntries.summary, `%${q}%`),
        sql`${changelogEntries.items}::text ILIKE ${`%${q}%`}`,
      )!,
    );
  }
  if (category && (CHANGELOG_CATEGORIES as readonly string[]).includes(category)) {
    conditions.push(sql`${changelogEntries.items} @> ${JSON.stringify([{ category }])}::jsonb`);
  }

  const rows = await db
    .select()
    .from(changelogEntries)
    .where(and(...conditions))
    .orderBy(desc(changelogEntries.releasedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const filtered = category
    ? rows.map((r) => ({
        ...r,
        items: (r.items as ChangelogItem[]).filter((i) => i.category === category),
      }))
    : rows;

  return NextResponse.json({
    entries: filtered,
    page,
    hasMore: rows.length === PAGE_SIZE,
  });
}
