import { safeEqual, isProduction } from "@/lib/security/security";

/**
 * Shared with the standalone Discord bot (`anikitty-discord-bot` `src/config.ts`).
 * Must be set via Coolify / runtime env `BOT_API_SECRET` — no hardcoded fallback.
 */
export function getBotApiSecret(): string {
  return process.env.BOT_API_SECRET?.trim() || "";
}

/** Authorize Discord bot / internal callers via `Authorization: Bearer <BOT_API_SECRET>`. */
export function authorizeBot(req: Request): boolean {
  const secret = getBotApiSecret();
  if (!secret) {
    if (isProduction()) return false;
    return false;
  }
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return safeEqual(auth.slice(7), secret);
}
