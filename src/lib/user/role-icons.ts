import type { ElementType } from "react";
import { Crown, Heart, Shield, Timer } from "lucide-react";
import {
  TIMESTAMP_HELPER_COLOR,
  TIMESTAMP_HELPER_DISPLAY,
  TIMESTAMP_HELPER_ROLE,
} from "@/lib/skip/timestamp-helper-config";

export const ROLE_ICONS: Record<string, ElementType> = {
  admin: Shield,
  moderator: Crown,
  donator: Heart,
  [TIMESTAMP_HELPER_ROLE]: Timer,
};

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderator",
  donator: "Donator",
  [TIMESTAMP_HELPER_ROLE]: TIMESTAMP_HELPER_DISPLAY,
};

export const ROLE_BUILTIN_COLORS: Record<string, string> = {
  admin: "#ff4d6d",
  moderator: "#4d9fff",
  donator: "#f472b6",
  [TIMESTAMP_HELPER_ROLE]: TIMESTAMP_HELPER_COLOR,
};

export function roleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] ?? role.replace(/_/g, " ");
}

export function roleIconFor(role: string): ElementType | null {
  return ROLE_ICONS[role] ?? null;
}
