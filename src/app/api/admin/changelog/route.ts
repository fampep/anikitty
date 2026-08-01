import { getDb } from "@/db";
import { changelogEntries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CHANGELOG_CATEGORIES, type ChangelogCategory, type ChangelogItem } from "@/lib/changelog/changelog-shared";

function sanitizeVersion(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, 40) : "";
}
function sanitizeSlug(input: unknown, fallback: string): string {
  const raw = typeof input === "string" && input.trim() ? input : fallback;
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
function sanitizeTitle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().slice(0, 200);
  return v || null;
}
function sanitizeSummary(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().slice(0, 2000);
  return v || null;
}
function sanitizeItems(input: unknown): ChangelogItem[] {
  if (!Array.isArray(input)) return [];
  const out: ChangelogItem[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const category = (row as { category?: unknown }).category;
    const text = (row as { text?: unknown }).text;
    if (
      typeof category === "string" &&
      (CHANGELOG_CATEGORIES as readonly string[]).includes(category) &&
      typeof text === "string" &&
      text.trim()
    ) {
      out.push({ category: category as ChangelogCategory, text: text.trim().slice(0, 300) });
    }
    if (out.length >= 100) break;
  }
  return out;
}
function sanitizeDate(input: unknown): Date | null {
  if (!input || typeof input !== "string") return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ── GET (list all, admin) ────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const rows = await db
    .select()
    .from(changelogEntries)
    .orderBy(desc(changelogEntries.createdAt));

  return NextResponse.json({ entries: rows });
}

// ── POST (create) ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json();
  const version = sanitizeVersion(raw.version);
  if (version.length < 1)
    return NextResponse.json({ error: "Version is required" }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .insert(changelogEntries)
    .values({
      version,
      slug: sanitizeSlug(raw.slug, version),
      title: sanitizeTitle(raw.title),
      summary: sanitizeSummary(raw.summary),
      items: sanitizeItems(raw.items),
      isFeatured: raw.isFeatured === true,
      isPublished: raw.isPublished === true,
      releasedAt: sanitizeDate(raw.releasedAt) ?? new Date(),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

// ── PATCH (update) ───────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json();
  if (typeof raw.id !== "string")
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof raw.version === "string") {
    const version = sanitizeVersion(raw.version);
    if (version.length < 1)
      return NextResponse.json({ error: "Version cannot be empty" }, { status: 400 });
    updates.version = version;
  }
  if (typeof raw.slug === "string") updates.slug = sanitizeSlug(raw.slug, raw.slug);
  if ("title" in raw) updates.title = sanitizeTitle(raw.title);
  if ("summary" in raw) updates.summary = sanitizeSummary(raw.summary);
  if ("items" in raw) updates.items = sanitizeItems(raw.items);
  if (typeof raw.isFeatured === "boolean") updates.isFeatured = raw.isFeatured;
  if (typeof raw.isPublished === "boolean") updates.isPublished = raw.isPublished;
  if ("releasedAt" in raw) updates.releasedAt = sanitizeDate(raw.releasedAt);

  const db = getDb();
  const [row] = await db
    .update(changelogEntries)
    .set(updates)
    .where(eq(changelogEntries.id, raw.id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (typeof id !== "string")
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  await db.delete(changelogEntries).where(eq(changelogEntries.id, id));
  return NextResponse.json({ ok: true });
}
