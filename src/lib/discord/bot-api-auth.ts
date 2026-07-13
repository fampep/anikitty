import { NextResponse } from "next/server";
import { getDiscordBotApiSecret } from "@/lib/discord/bot-config";

export function verifyDiscordBotRequest(req: Request): NextResponse | null {
  const secret = getDiscordBotApiSecret();
  if (!secret) {
    return NextResponse.json({ error: "Bot API not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
