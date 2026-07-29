import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { sendDiscordWebhook } from "@/lib/discord/webhook-sender";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const ok = await sendDiscordWebhook(id, "system.started", {
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok });
}
