import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyDiscordBotRequest } from "@/lib/discord/bot-api-auth";
import { linkDiscordAccountByCode } from "@/lib/discord/discord-link";

export async function POST(req: Request) {
  const denied = verifyDiscordBotRequest(req);
  if (denied) return denied;

  let body: {
    code?: string;
    discordId?: string;
    discordUsername?: string;
    discordGlobalName?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  const discordId = body.discordId?.trim();
  if (!code || !discordId) {
    return NextResponse.json({ error: "code and discordId required" }, { status: 400 });
  }

  const db = getDb();
  const result = await linkDiscordAccountByCode(db, code, {
    id: discordId,
    username: body.discordUsername?.trim() || discordId,
    global_name: body.discordGlobalName ?? null,
  });

  if (!result.ok) {
    const status =
      result.reason === "invalid_code" || result.reason === "expired" ? 400 : 409;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, username: result.username });
}
