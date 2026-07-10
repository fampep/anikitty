"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Home,
  Menu,
  MessagesSquare,
  Search,
  Timer,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GroupedNavLinks, isNavActive, useMenuItems } from "@/components/layout/site-nav-menu";

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
      <Icon className={cn("h-[18px] w-[18px]", active && "text-violet-500 dark:text-violet-300")} strokeWidth={active ? 2.25 : 1.85} />
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-500 dark:bg-violet-300" aria-hidden />
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

function MoreNavSheet({ pathname, active }: { pathname: string; active: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const menuItems = useMenuItems();
  const primaryHrefs = new Set<string>(PRIMARY_TABS.map((tab) => tab.href));
  const moreItems = menuItems.filter((item) => !primaryHrefs.has(item.href));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div>
          <BottomNavTab active={active} label={t("nav.more")} icon={Menu} />
        </div>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="z-[150] max-h-[min(82vh,34rem)] rounded-t-2xl border-border/60 bg-background/98 p-0 backdrop-blur-2xl dark:border-white/[0.06] dark:bg-[#050508]/98"
        hideCloseButton
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <p className="text-sm font-semibold tracking-tight text-foreground dark:text-white">{t("nav.more")}</p>
          <SheetClose
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/45 dark:hover:bg-white/8 dark:hover:text-white"
            aria-label={t("nav.aria.closeMenu")}
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </div>
        <nav
          className="overflow-y-auto border-t border-border/60 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/[0.05]"
          aria-label={t("nav.aria.mobileNav")}
        >
          <GroupedNavLinks items={moreItems} pathname={pathname} onNavigate={() => setOpen(false)} sheet />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export default function MobileBottomNav() {
  const t = useT();
  const pathname = usePathname();
  const menuItems = useMenuItems();

  if (shouldHideBottomNav(pathname)) return null;

  const primaryHrefs = new Set<string>(PRIMARY_TABS.map((tab) => tab.href));
  const moreActive = menuItems.some(
    (item) => !primaryHrefs.has(item.href) && isNavActive(pathname, item.href),
  );

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
            <MoreNavSheet pathname={pathname} active={moreActive} />
          </div>
        </div>
      </nav>
    </>
  );
}
