"use client";

import Link from "next/link";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import {
  Activity,
  CalendarDays,
  Captions,
  Coffee,
  Coins,
  Flame,
  HelpCircle,
  History,
  Home,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Mic,
  Scale,
  Search,
  Timer,
  Tv2,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";

export type MenuGroup = "browse" | "watch" | "community" | "site" | "account";

export const MENU_GROUP_ORDER: MenuGroup[] = ["browse", "watch", "community", "site", "account"];

export const MENU_DEFS = [
  { href: ROUTES.HOME, icon: Home, titleKey: "nav.home", shortKey: "nav.short.home", group: "browse" as MenuGroup },
  { href: ROUTES.TRENDING, icon: Flame, titleKey: "nav.trending", shortKey: "nav.short.trending", group: "browse" as MenuGroup },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, titleKey: "nav.schedule", shortKey: "nav.short.schedule", group: "browse" as MenuGroup },
  { href: ROUTES.NEW, icon: Tv2, titleKey: "nav.newReleases", shortKey: "nav.short.newReleases", group: "browse" as MenuGroup },
  { href: ROUTES.SEARCH, icon: Search, titleKey: "nav.search", shortKey: "nav.short.search", group: "browse" as MenuGroup },
  { href: ROUTES.COMMUNITY, icon: MessageSquare, titleKey: "nav.community", shortKey: "nav.short.community", group: "browse" as MenuGroup },
  { href: ROUTES.VOICE_ACTORS, icon: Mic, titleKey: "nav.voiceActors", shortKey: "nav.short.voiceActors", group: "browse" as MenuGroup },
  { href: ROUTES.SUBTITLES, icon: Captions, titleKey: "nav.subtitles", shortKey: "nav.short.subtitles", group: "watch" as MenuGroup },
  { href: ROUTES.TIMESTAMPS, icon: Timer, titleKey: "nav.timestamps", shortKey: "nav.short.timestamps", group: "watch" as MenuGroup },
  { href: ROUTES.WATCH_TOGETHER, icon: Users, titleKey: "nav.watchTogether", shortKey: "nav.short.together", group: "watch" as MenuGroup },
  { href: ROUTES.FORUM, icon: MessagesSquare, titleKey: "nav.forum", shortKey: "nav.short.forum", group: "community" as MenuGroup },
  { href: ROUTES.CHAT, icon: MessageCircle, titleKey: "nav.chat", shortKey: "nav.short.chat", group: "community" as MenuGroup },
  { href: ROUTES.MESSAGES, icon: Mail, titleKey: "nav.messages", shortKey: "nav.short.messages", group: "community" as MenuGroup, authOnly: true },
  { href: ROUTES.SHOP, icon: Coins, titleKey: "nav.shop", shortKey: "nav.short.shop", group: "site" as MenuGroup },
  { href: ROUTES.DONATE, icon: Coffee, titleKey: "nav.donate", shortKey: "nav.short.donate", group: "site" as MenuGroup },
  { href: ROUTES.STATUS, icon: Activity, titleKey: "nav.status", shortKey: "nav.short.status", group: "site" as MenuGroup },
  { href: ROUTES.FAQ, icon: HelpCircle, titleKey: "nav.faq", shortKey: "nav.short.faq", group: "site" as MenuGroup },
  { href: ROUTES.DMCA, icon: Scale, titleKey: "nav.dmca", shortKey: "nav.short.dmca", group: "site" as MenuGroup },
  { href: ROUTES.HISTORY, icon: History, titleKey: "nav.watchHistory", shortKey: "nav.short.watchHistory", group: "account" as MenuGroup, authOnly: true },
] as const;

export type MenuItem = {
  href: string;
  icon: (typeof MENU_DEFS)[number]["icon"];
  title: string;
  short: string;
  group: MenuGroup;
};

export function isNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === ROUTES.HOME) return false;
  if (href === ROUTES.SEARCH) return pathname.startsWith("/search");
  if (href === ROUTES.FORUM) return pathname.startsWith("/forum");
  if (href === ROUTES.MESSAGES) return pathname.startsWith("/messages");
  if (href === ROUTES.VOICE_ACTORS) return pathname.startsWith("/voice-actor");
  if (href === ROUTES.TIMESTAMPS) return pathname.startsWith("/timestamps");
  return pathname.startsWith(`${href}/`);
}

export function useMenuItems(): MenuItem[] {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  return MENU_DEFS.filter((item) => {
    if ("authOnly" in item && item.authOnly && !auth) return false;
    return true;
  }).map((item) => ({
    href: item.href,
    icon: item.icon,
    title: t(item.titleKey),
    short: t(item.shortKey),
    group: item.group,
  }));
}

export function GroupedNavLinks({
  items,
  pathname,
  onNavigate,
  compact,
  sheet,
  grid,
}: {
  items: readonly MenuItem[];
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
  /** @deprecated use `grid` */
  sheet?: boolean;
  grid?: boolean;
}) {
  const t = useT();
  const isGrid = grid ?? sheet;
  const groups = MENU_GROUP_ORDER.map((group) => ({
    group,
    label: t(`nav.groups.${group}`),
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : isGrid ? "gap-3" : "gap-2")}>
      {groups.map((section, index) => (
        <div key={section.group}>
          {index > 0 && !isGrid && <div className="my-1.5 h-px bg-border/70 dark:bg-white/[0.06]" />}
          <p
            className={cn(
              "font-semibold uppercase tracking-[0.12em] text-muted-foreground/75 dark:text-white/30",
              isGrid ? "px-1 pb-1.5 text-[10px]" : "px-3 pb-1 pt-0.5 text-[10px]",
            )}
          >
            {section.label}
          </p>
          <div className={cn(isGrid ? "grid grid-cols-2 gap-0.5" : "flex flex-col gap-0.5")}>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded-xl transition-[background-color,color,transform] duration-150",
                    isGrid ? "px-2.5 py-2 text-[12px]" : "rounded-lg px-3 py-2 text-sm",
                    active
                      ? "nav-link-active user-accent-nav-active font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.98] dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white",
                  )}
                >
                  <Icon className={cn("shrink-0 opacity-80", isGrid ? "h-3.5 w-3.5" : "h-4 w-4")} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
