import type { ElementType } from "react";
import { Crown, Heart, Rocket, Shield } from "lucide-react";
import {
  BOOSTER_COLOR,
  BOOSTER_DESCRIPTION,
  BOOSTER_DISPLAY,
  BOOSTER_ROLE,
} from "@/lib/social/booster-config";
import {
  TIMESTAMP_TIERS,
  isTimestampRole,
} from "@/lib/skip/timestamp-helper-config";
import { TIMESTAMP_TIER_ICONS } from "@/lib/skip/timestamp-tier-icons";

export const ROLE_ICONS: Record<string, ElementType> = {
  admin: Shield,
  moderator: Crown,
  donator: Heart,
  [BOOSTER_ROLE]: Rocket,
  ...Object.fromEntries(
    TIMESTAMP_TIERS.map((tier) => [tier.id, TIMESTAMP_TIER_ICONS[tier.icon] ?? Shield]),
  ),
};

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  donator: "Donator",
  [BOOSTER_ROLE]: BOOSTER_DISPLAY,
  ...Object.fromEntries(TIMESTAMP_TIERS.map((tier) => [tier.id, tier.name])),
};

export const ROLE_BUILTIN_COLORS: Record<string, string> = {
  admin: "#ff4d6d",
  moderator: "#4d9fff",
  donator: "#f472b6",
  [BOOSTER_ROLE]: BOOSTER_COLOR,
  ...Object.fromEntries(TIMESTAMP_TIERS.map((tier) => [tier.id, tier.color])),
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full site administration access",
  moderator: "Community moderation and comment tools",
  donator: "Supports AniKitty through Ko-fi",
  [BOOSTER_ROLE]: BOOSTER_DESCRIPTION,
  ...Object.fromEntries(TIMESTAMP_TIERS.map((tier) => [tier.id, tier.description])),
};

export function roleDescription(role: string): string | null {
  return ROLE_DESCRIPTIONS[role] ?? null;
}

export function roleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] ?? role.replace(/_/g, " ");
}

export function roleIconFor(role: string): ElementType | null {
  return ROLE_ICONS[role] ?? null;
}

export { isTimestampRole };
