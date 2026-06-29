import { isDiscordOAuthConfigured } from "@/lib/discord-oauth";

export async function GET() {
  return Response.json(
    { enabled: isDiscordOAuthConfigured() },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
