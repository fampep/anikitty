"use client";

import {
  Cloud,
  Coffee,
  Crown,
  Film,
  Flame,
  Gem,
  Ghost,
  Heart,
  Leaf,
  Library,
  Moon,
  Music,
  Rocket,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Swords,
  Trophy,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { CollectionIcon as IconName } from "@/lib/collections/collection-shared";

const ICON_MAP: Record<IconName, LucideIcon> = {
  library: Library,
  heart: Heart,
  star: Star,
  flame: Flame,
  sparkles: Sparkles,
  gem: Gem,
  swords: Swords,
  wand: Wand2,
  ghost: Ghost,
  rocket: Rocket,
  film: Film,
  music: Music,
  moon: Moon,
  sun: Sun,
  cloud: Cloud,
  snowflake: Snowflake,
  leaf: Leaf,
  coffee: Coffee,
  trophy: Trophy,
  crown: Crown,
};

export function resolveCollectionIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name as IconName] ?? null;
}

export function CollectionIconGlyph({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = resolveCollectionIcon(name);
  if (!Icon) return null;
  return <Icon className={className} aria-hidden />;
}
