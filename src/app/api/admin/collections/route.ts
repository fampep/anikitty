import { getDb } from "@/db";
import { collections, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { rowToSummary, SUMMARY_SELECT } from "@/lib/collections/collection-server";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

const PAGE_SIZE = 30;

/** GET — public collections for the admin browser, newest or most-followed first. */
export async function GET(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const featuredOnly = url.searchParams.get("featured") === "1";

  const where = featuredOnly
    ? and(eq(collections.visibility, "public"), eq(collections.isFeatured, true))
    : eq(collections.visibility, "public");

  const [rows, countRow] = await Promise.all([
    getDb()
      .select(SUMMARY_SELECT)
      .from(collections)
      .leftJoin(users, eq(users.id, collections.ownerId))
      .where(where)
      .orderBy(desc(collections.followerCount), desc(collections.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    getDb().select({ count: sql<number>`count(*)::int` }).from(collections).where(where),
  ]);

  const total = countRow[0]?.count ?? 0;
  return NextResponse.json({
    collections: rows.map(rowToSummary),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

/** PATCH — toggle the staff-featured flag and its shelf label. */
export async function PATCH(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof raw.isFeatured === "boolean") patch.isFeatured = raw.isFeatured;
  if (typeof raw.featuredLabel === "string" || raw.featuredLabel === null) {
    patch.featuredLabel =
      typeof raw.featuredLabel === "string" ? raw.featuredLabel.trim().slice(0, 40) || null : null;
  }

  await getDb().update(collections).set(patch).where(eq(collections.id, id));
  return NextResponse.json({ ok: true });
}
