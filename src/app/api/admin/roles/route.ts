import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { roles } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const rows = await db.select().from(roles).orderBy(roles.name);
  return NextResponse.json({ roles: rows });
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = getDb();
  const [row] = await db.insert(roles).values({ name: name.trim(), color: color ?? "#ffffff" }).returning();
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, color } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const [row] = await db.update(roles).set({
    ...(name ? { name: name.trim() } : {}),
    ...(color ? { color } : {}),
  }).where(eq(roles.id, id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  await db.delete(roles).where(eq(roles.id, id));
  return NextResponse.json({ ok: true });
}
