import {
  Bell,
  Bookmark,
  CircleHelp,
  Coffee,
  History,
  MessageSquare,
  Rocket,
  Search,
  Star,
  Tv2,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { FaqCategoryDto, FaqCategoryMeta } from "@/lib/faq/types";

const FAQ_ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  User,
  Tv2,
  Bookmark,
  History,
  MessageSquare,
  Search,
  Star,
  Bell,
  Coffee,
  Wrench,
  CircleHelp,
};

export function resolveFaqIcon(name: string): LucideIcon {
  return FAQ_ICON_MAP[name] ?? CircleHelp;
}

export function toFaqCategoryMeta(dto: FaqCategoryDto): FaqCategoryMeta {
  return {
    id: dto.id,
    labelKey: dto.labelKey,
    order: dto.order,
    icon: resolveFaqIcon(dto.icon),
  };
}
