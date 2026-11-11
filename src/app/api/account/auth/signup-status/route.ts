import { isOpenSignupsEnabled } from "@/lib/auth/open-signups";
import { TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";

/** Public: whether new accounts can be created right now. */
export async function GET() {
  const open = isOpenSignupsEnabled();
  return Response.json(
    {
      open,
      telegramUrl: TELEGRAM_CHANNEL_URL,
    },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
