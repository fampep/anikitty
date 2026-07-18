import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getOnlineCount } from "@/lib/online/presence-store";

export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await getOnlineCount();
  return Response.json({ count });
}
