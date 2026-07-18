"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Menu,
  MessagesSquare,
  Search,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import MoreNavMenu from "@/components/layout/more-nav-menu";
import { isNavActive, useMenuItems } from "@/components/layout/site-nav-menu";

const PRIMARY_TABS = [
  { href: ROUTES.HOME, icon: Home, labelKey: "nav.short.home", match: (p: string) => p === ROUTES.HOME },
  { href: ROUTES.SEARCH, icon: Search, labelKey: "nav.short.search", match: (p: string) => p === ROUTES.SEARCH || p.startsWith("/search") },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, labelKey: "nav.short.schedule", match: (p: string) => p === ROUTES.SCHEDULE },
  { href: ROUTES.TIMESTAMPS, icon: Timer, labelKey: "nav.short.timestamps", match: (p: string) => p.startsWith("/timestamps") },
  { href: ROUTES.FORUM, icon: MessagesSquare, labelKey: "nav.short.forum", match: (p: string) => p === ROUTES.FORUM || p.startsWith("/forum") },
] as const;

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/anime/watch")) return true;
  if (pathname.startsWith("/admin")) return true;
  return false;
}

function BottomNavTab({
  active,
  label,
  icon: Icon,
  onClick,
  href,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "relative flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors",
    active
      ? "text-foreground dark:text-white"
      : "text-muted-foreground/65 hover:text-foreground/90 dark:text-white/40 dark:hover:text-white/75",
  );

  const iconEl = (
    <>
      <Icon className={cn("h-[18px] w-[18px]", active && "text-primary dark:text-zinc-300")} strokeWidth={active ? 2.25 : 1.85} />
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary dark:bg-zinc-300" aria-hidden />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} title={label} aria-label={label} aria-current={active ? "page" : undefined} className={className}>
        {iconEl}
      </Link>
    );
  }

  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={className}>
      {iconEl}
    </button>
  );
}

export default function MobileBottomNav() {
  const t = useT();
  const pathname = usePathname();
  const menuItems = useMenuItems();

  if (shouldHideBottomNav(pathname)) return null;

  const primaryHrefs = new Set<string>(PRIMARY_TABS.map((tab) => tab.href));
  const moreItems = menuItems.filter((item) => !primaryHrefs.has(item.href));
  const moreActive = moreItems.some((item) => isNavActive(pathname, item.href));

  return (
    <>
      <div className="h-[var(--mobile-nav-total)] shrink-0" aria-hidden />
      <nav aria-label={t("nav.aria.mobileBottomNav")} className="fixed inset-x-0 bottom-0 z-[95] pointer-events-none">
        <div className="mx-auto max-w-md px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:max-w-lg">
          <div className="site-bottom-nav pointer-events-auto flex items-center justify-between gap-1 px-2 py-1.5">
            {PRIMARY_TABS.map(({ href, icon, labelKey, match }) => (
              <BottomNavTab
                key={href}
                href={href}
                label={t(labelKey)}
                icon={icon}
                active={match(pathname)}
              />
            ))}
            <MoreNavMenu
              pathname={pathname}
              items={moreItems}
              trigger={
                <button
                  type="button"
                  title={t("nav.more")}
                  aria-label={t("nav.more")}
                  aria-haspopup="dialog"
                  className={cn(
                    "relative flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors",
                    moreActive
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground/65 hover:text-foreground/90 dark:text-white/40 dark:hover:text-white/75",
                    "data-[state=open]:bg-primary/10 data-[state=open]:text-primary dark:data-[state=open]:text-zinc-300",
                  )}
                >
                  <Menu
                    className={cn("h-[18px] w-[18px]", moreActive && "text-primary dark:text-zinc-300")}
                    strokeWidth={moreActive ? 2.25 : 1.85}
                  />
                  {moreActive && (
                    <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary dark:bg-zinc-300" aria-hidden />
                  )}
                </button>
              }
            />
          </div>
        </div>
      </nav>
    </>
  );
}
