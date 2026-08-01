import "server-only";
import { unstable_cache } from "next/cache";
import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { changelogEntries } from "@/db/schema";
import type { ChangelogItem } from "@/lib/changelog/changelog-shared";

export type ChangelogEntry = {
  id: string;
  version: string;
  slug: string;
  title: string | null;
  summary: string | null;
  items: ChangelogItem[];
  isFeatured: boolean;
  releasedAt: string;
  createdAt: string;
};

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

function toEntry(row: typeof changelogEntries.$inferSelect): ChangelogEntry {
  return {
    id: row.id,
    version: row.version,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    items: Array.isArray(row.items) ? (row.items as ChangelogItem[]) : [],
    isFeatured: row.isFeatured,
    releasedAt: toIso(row.releasedAt ?? row.createdAt),
    createdAt: toIso(row.createdAt),
  };
}

async function fetchChangelogEntriesUncached(): Promise<ChangelogEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(changelogEntries)
    .where(eq(changelogEntries.isPublished, true))
    .orderBy(desc(changelogEntries.releasedAt))
    .limit(50);
  return rows.map(toEntry);
}

export const getChangelogEntries = unstable_cache(
  fetchChangelogEntriesUncached,
  ["changelog-entries-v1"],
  { revalidate: 120 },
);

export async function getChangelogEntry(slugOrVersion: string): Promise<ChangelogEntry | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(changelogEntries)
    .where(
      and(
        eq(changelogEntries.isPublished, true),
        or(eq(changelogEntries.slug, slugOrVersion), eq(changelogEntries.version, slugOrVersion)),
      ),
    )
    .limit(1);
  return row ? toEntry(row) : null;
}

export type ChangelogSummary = { version: string; slug: string; title: string | null };

/** Latest published entry — for the bell's "have you seen this" check. */
export const getLatestChangelogSummary = unstable_cache(
  async (): Promise<ChangelogSummary | null> => {
    const entries = await fetchChangelogEntriesUncached();
    const latest = entries[0];
    return latest ? { version: latest.version, slug: latest.slug, title: latest.title } : null;
  },
  ["changelog-latest-summary-v1"],
  { revalidate: 120 },
);
