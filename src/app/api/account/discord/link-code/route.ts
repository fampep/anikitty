import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { createDiscordLinkCode } from "@/lib/discord/discord-link";
import { isDiscordBotConfigured } from "@/lib/discord/bot-config";

export async function POST(req: Request) {
  if (!isDiscordBotConfigured()) {
    return NextResponse.json({ error: "Discord bot is not configured" }, { status: 503 });
  }

  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDb();
    const code = await createDiscordLinkCode(db, payload.userId);
    return NextResponse.json({
      code,
      expiresInSeconds: 600,
      hint: "Run /link on the Discord server with this code.",
    });
  } catch (e) {
    console.error("[discord link-code]", e);
    return NextResponse.json({ error: "Could not create link code" }, { status: 500 });
  }
}
