import { isDiscordOAuthConfigured } from "@/lib/oauth/discord-oauth";
import { isDiscordBotConfigured } from "@/lib/discord/bot-config";

export async function GET() {
  return Response.json(
    {
      enabled: isDiscordOAuthConfigured(),
      botEnabled: isDiscordBotConfigured(),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
