import type { ElementType } from "react";
import {
  Award,
  Crown,
  Eye,
  Flame,
  Heart,
  Play,
  Shield,
  Sparkles,
  Star,
  Tv,
  Zap,
} from "lucide-react";

export const LEVEL_TIER_ICONS: Record<string, ElementType> = {
  Eye,
  Play,
  Tv,
  Star,
  Heart,
  Zap,
  Flame,
  Award,
  Shield,
  Crown,
  Sparkles,
};

export function tierNameToKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}
