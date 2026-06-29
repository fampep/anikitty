import { getDb } from "@/db";
import { announcements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { and, eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

const VALID_SEVERITIES = ["info", "warn", "critical", "success"] as const;
type Severity = (typeof VALID_SEVERITIES)[number];

function sanitizeTitle(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, 200) : "";
}
function sanitizeBody(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, 5000) : "";
}
function sanitizeLinkUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw.slice(0, 500);
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}
function sanitizeLinkLabel(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().slice(0, 60);
  return v || null;
}
function sanitizeSeverity(input: unknown): Severity {
  return VALID_SEVERITIES.includes(input as Severity) ? (input as Severity) : "info";
}
function sanitizeDate(input: unknown): Date | null {
  if (!input || typeof input !== "string") return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ── GET (list all) ─────────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));

  return NextResponse.json({ announcements: rows });
}

// ── POST (create) ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json();
  const title = sanitizeTitle(raw.title);
  if (title.length < 3)
    return NextResponse.json({ error: "Title must be at least 3 characters" }, { status: 400 });

  const db = getDb();
  const [row] = await db
    .insert(announcements)
    .values({
      title,
      body: sanitizeBody(raw.body),
      severity: sanitizeSeverity(raw.severity),
      isActive: raw.isActive !== false,
      dismissible: raw.dismissible !== false,
      linkUrl: sanitizeLinkUrl(raw.linkUrl),
      linkLabel: sanitizeLinkLabel(raw.linkLabel),
      startsAt: sanitizeDate(raw.startsAt),
      endsAt: sanitizeDate(raw.endsAt),
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

// ── PATCH (update) ─────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json();
  if (typeof raw.id !== "string")
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof raw.title === "string") {
    const title = sanitizeTitle(raw.title);
    if (title.length < 3)
      return NextResponse.json({ error: "Title too short" }, { status: 400 });
    updates.title = title;
  }
  if (typeof raw.body === "string") updates.body = sanitizeBody(raw.body);
  if (typeof raw.severity === "string") updates.severity = sanitizeSeverity(raw.severity);
  if (typeof raw.isActive === "boolean") updates.isActive = raw.isActive;
  if (typeof raw.dismissible === "boolean") updates.dismissible = raw.dismissible;
  if ("linkUrl" in raw) updates.linkUrl = sanitizeLinkUrl(raw.linkUrl);
  if ("linkLabel" in raw) updates.linkLabel = sanitizeLinkLabel(raw.linkLabel);
  if ("startsAt" in raw) updates.startsAt = sanitizeDate(raw.startsAt);
  if ("endsAt" in raw) updates.endsAt = sanitizeDate(raw.endsAt);

  const db = getDb();
  const [row] = await db
    .update(announcements)
    .set(updates)
    .where(eq(announcements.id, raw.id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

// ── DELETE ─────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (typeof id !== "string")
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  await db.delete(announcements).where(eq(announcements.id, id));
  return NextResponse.json({ ok: true });
}

// Silence unused-import warning if `and` is not used.
void and;
