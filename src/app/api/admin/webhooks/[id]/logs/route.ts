import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { discordWebhookLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);

  const db = getDb();
  const rows = await db
    .select()
    .from(discordWebhookLogs)
    .where(eq(discordWebhookLogs.webhookId, id))
    .orderBy(desc(discordWebhookLogs.createdAt))
    .limit(limit);

  return NextResponse.json(rows);
}
