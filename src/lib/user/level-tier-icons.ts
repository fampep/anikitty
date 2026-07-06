import type { ElementType } from "react";
import {
  Atom,
  Award,
  Crown,
  Eye,
  Flame,
  Gem,
  Heart,
  Infinity,
  Medal,
  Play,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Tv,
  Wand2,
  Zap,
} from "lucide-react";

export const LEVEL_TIER_ICONS: Record<string, ElementType> = {
  Eye,
  Play,
  Tv,
  Star,
  Sparkles,
  Heart,
  Gem,
  Zap,
  Flame,
  Swords,
  Award,
  Shield,
  Trophy,
  Crown,
  Medal,
  Wand2,
  Rocket,
  Infinity,
  Atom,
};

export function tierNameToKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}
