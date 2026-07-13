import { BOOSTER_ROLE } from "@/lib/discord/bot-config";

export function isActiveBooster(
  role?: string | null,
  discordBoostSince?: Date | string | null,
): boolean {
  if (role === BOOSTER_ROLE) return true;
  if (!discordBoostSince) return false;
  const d =
    discordBoostSince instanceof Date
      ? discordBoostSince
      : new Date(discordBoostSince);
  return !Number.isNaN(d.getTime());
}
