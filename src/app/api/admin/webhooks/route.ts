import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { discordWebhooks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const rows = await db.select().from(discordWebhooks).orderBy(discordWebhooks.createdAt);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, webhookUrl, category, description, enabled, embedColor, customAvatar, customUsername } = body;
  if (!name || !webhookUrl)
    return NextResponse.json({ error: "name and webhookUrl required" }, { status: 400 });

  const db = getDb();
  const [created] = await db
    .insert(discordWebhooks)
    .values({
      name,
      webhookUrl,
      category: category || "system",
      description: description || null,
      enabled: enabled ?? true,
      embedColor: embedColor || null,
      customAvatar: customAvatar || null,
      customUsername: customUsername || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const [updated] = await db
    .update(discordWebhooks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(discordWebhooks.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  await db.delete(discordWebhooks).where(eq(discordWebhooks.id, id));
  return NextResponse.json({ ok: true });
}
