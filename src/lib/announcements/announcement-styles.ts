import {
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export type AnnouncementSeverity = "info" | "warn" | "critical" | "success" | "promo" | string;

export const ANNOUNCEMENT_STYLES: Record<
  string,
  { bg: string; border: string; text: string; icon: LucideIcon; iconColor: string }
> = {
  info: {
    bg: "bg-sky-500/[0.07]",
    border: "border-sky-500/25",
    text: "text-sky-100",
    icon: Info,
    iconColor: "text-sky-300",
  },
  warn: {
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/25",
    text: "text-amber-100",
    icon: AlertTriangle,
    iconColor: "text-amber-300",
  },
  critical: {
    bg: "bg-rose-500/[0.10]",
    border: "border-rose-500/30",
    text: "text-rose-100",
    icon: AlertOctagon,
    iconColor: "text-rose-300",
  },
  success: {
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/25",
    text: "text-emerald-100",
    icon: CheckCircle2,
    iconColor: "text-emerald-300",
  },
  promo: {
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/25",
    text: "text-violet-100",
    icon: Megaphone,
    iconColor: "text-violet-300",
  },
};

/** Severities shown on home and watch pages where normal banners are hidden. */
export const PRIORITY_ANNOUNCEMENT_SEVERITIES = new Set(["critical", "warn"]);
