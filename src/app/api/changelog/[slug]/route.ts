import { getDb } from "@/db";
import { changelogEntries } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

// ── GET — public, published only. Matches by slug or raw version. ───────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .select()
    .from(changelogEntries)
    .where(
      and(
        eq(changelogEntries.isPublished, true),
        or(eq(changelogEntries.slug, slug), eq(changelogEntries.version, slug)),
      ),
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry: row });
}
