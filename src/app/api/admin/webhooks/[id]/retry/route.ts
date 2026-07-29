import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { discordWebhookLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { eq } from "drizzle-orm";
import { sendDiscordWebhook } from "@/lib/discord/webhook-sender";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { logId } = await req.json();
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

  const db = getDb();
  const [log] = await db
    .select()
    .from(discordWebhookLogs)
    .where(eq(discordWebhookLogs.id, logId))
    .limit(1);

  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  const ok = await sendDiscordWebhook(
    id,
    log.eventType,
    (log.payload as Record<string, string>) ?? {},
  );

  return NextResponse.json({ ok });
}
