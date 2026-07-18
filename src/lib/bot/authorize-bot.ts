import { safeEqual } from "@/lib/security/security";

/**
 * Shared with the standalone Discord bot (`anikitty-discord-bot` `src/config.ts`).
 * Prefer Coolify runtime env `BOT_API_SECRET`; hardcoded fallback keeps local/prod
 * in sync when env is unset (same pattern as the bot repo).
 */
const BOT_API_SECRET_FALLBACK =
  "XXN5t-SbHswEqo_hN3IEqCE7xSVKQ5VFFNDOn5Y6i2o";

export function getBotApiSecret(): string {
  return process.env.BOT_API_SECRET?.trim() || BOT_API_SECRET_FALLBACK;
}

/** Authorize Discord bot / internal callers via `Authorization: Bearer <BOT_API_SECRET>`. */
export function authorizeBot(req: Request): boolean {
  const secret = getBotApiSecret();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return safeEqual(auth.slice(7), secret);
}
