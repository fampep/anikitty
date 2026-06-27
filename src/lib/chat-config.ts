/** How long live chat messages stay visible (default 2 hours). */
export const CHAT_MESSAGE_TTL_MS =
  (Math.max(1, parseInt(process.env.CHAT_MESSAGE_TTL_HOURS ?? "2", 10) || 2)) *
  60 *
  60 *
  1000;

export function getChatCutoffDate(now = Date.now()): Date {
  return new Date(now - CHAT_MESSAGE_TTL_MS);
}

export function isChatMessageActive(
  createdAt: string | Date,
  now = Date.now(),
): boolean {
  const ts =
    createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return !Number.isNaN(ts) && ts >= now - CHAT_MESSAGE_TTL_MS;
}

export function formatChatTtlLabel(ttlMs: number = CHAT_MESSAGE_TTL_MS): string {
  const hours = ttlMs / (60 * 60 * 1000);
  if (hours >= 1) {
    const h = Math.round(hours);
    return `${h} hour${h !== 1 ? "s" : ""}`;
  }
  const mins = Math.round(ttlMs / (60 * 1000));
  return `${mins} minute${mins !== 1 ? "s" : ""}`;
}

export function chatExpiresInLabel(
  createdAt: string | Date,
  ttlMs: number = CHAT_MESSAGE_TTL_MS,
  now = Date.now(),
): string {
  const ts =
    createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  const remaining = ts + ttlMs - now;
  if (remaining <= 0) return "expired";
  const min = Math.ceil(remaining / 60_000);
  if (min < 60) return `${min}m left`;
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return rm > 0 ? `${hr}h ${rm}m left` : `${hr}h left`;
}
