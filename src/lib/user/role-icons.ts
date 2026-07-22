import type { ElementType } from "react";
import { Crown, Heart, Rocket, Shield, Timer } from "lucide-react";
import {
  BOOSTER_COLOR,
  BOOSTER_DESCRIPTION,
  BOOSTER_DISPLAY,
  BOOSTER_ROLE,
} from "@/lib/social/booster-config";
import {
  TIMESTAMP_HELPER_COLOR,
  TIMESTAMP_HELPER_DISPLAY,
  TIMESTAMP_HELPER_ROLE,
} from "@/lib/skip/timestamp-helper-config";

export const ROLE_ICONS: Record<string, ElementType> = {
  admin: Shield,
  moderator: Crown,
  donator: Heart,
  [BOOSTER_ROLE]: Rocket,
  [TIMESTAMP_HELPER_ROLE]: Timer,
};

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  donator: "Donator",
  [BOOSTER_ROLE]: BOOSTER_DISPLAY,
  [TIMESTAMP_HELPER_ROLE]: TIMESTAMP_HELPER_DISPLAY,
};

export const ROLE_BUILTIN_COLORS: Record<string, string> = {
  admin: "#ff4d6d",
  moderator: "#4d9fff",
  donator: "#f472b6",
  [BOOSTER_ROLE]: BOOSTER_COLOR,
  [TIMESTAMP_HELPER_ROLE]: TIMESTAMP_HELPER_COLOR,
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full site administration access",
  moderator: "Community moderation and comment tools",
  donator: "Supports AniKitty through Ko-fi",
  [BOOSTER_ROLE]: BOOSTER_DESCRIPTION,
  [TIMESTAMP_HELPER_ROLE]: "Helps curate community skip timestamps",
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
