"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
import MoreNavMenu from "@/components/layout/more-nav-menu";
import { isNavActive, useMenuItems } from "@/components/layout/site-nav-menu";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";
import SearchBar from "@/components/layout/search-bar";
import NavbarAvatar from "@/components/layout/navbar-avatar";
import NotificationBell from "@/components/layout/notification-bell";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";

const PRIMARY_TABS = [
  { href: ROUTES.HOME, icon: Home, labelKey: "nav.short.home", match: (p: string) => p === ROUTES.HOME },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, labelKey: "nav.short.schedule", match: (p: string) => p === ROUTES.SCHEDULE },
  { href: ROUTES.TIMESTAMPS, icon: Timer, labelKey: "nav.short.timestamps", match: (p: string) => p.startsWith("/timestamps") },
  { href: ROUTES.FORUM, icon: MessagesSquare, labelKey: "nav.short.forum", match: (p: string) => p === ROUTES.FORUM || p.startsWith("/forum") },
] as const;

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (isPublicAdminUiPath(pathname)) return true;
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
    "site-bottom-tab relative flex h-11 w-11 flex-none items-center justify-center rounded-full",
    active
      ? "text-foreground dark:text-white"
      : "text-muted-foreground/65 hover:text-foreground/90 dark:text-white/40 dark:hover:text-white/75",
  );

  const iconEl = (
    <>
      <Icon className={cn("h-[18px] w-[18px]", active && "text-primary dark:text-zinc-300")} strokeWidth={active ? 2.25 : 1.85} />
      {active && (
        <span className="site-bottom-dot absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary dark:bg-zinc-300" aria-hidden />
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
  const user = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [searchOpen, setSearchOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const authBag = { auth: user, setAuth, clearAuth };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.querySelector("input")?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  if (shouldHideBottomNav(pathname)) return null;

  const primaryHrefs = new Set<string>(PRIMARY_TABS.map((tab) => tab.href));
  const moreItems = menuItems.filter((item) => !primaryHrefs.has(item.href));
  const moreActive = moreItems.some((item) => isNavActive(pathname, item.href));

  return (
    <>
      {/* No layout reservation: the pill is fixed and floats over content, so
          a spacer here only adds dead space at the end of the page. */}
      <nav
        aria-label={t("nav.aria.mobileBottomNav")}
        className="site-mobile-nav fixed inset-x-0 bottom-0 z-[95] pointer-events-none"
      >
        <div
          className={cn(
            "site-bottom-shell mx-auto px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))]",
            searchOpen ? "max-w-2xl" : "max-w-md sm:max-w-lg",
          )}
        >
          <div
            ref={pillRef}
            data-search-open={searchOpen || undefined}
            className="site-bottom-nav pointer-events-auto flex items-center gap-1 px-2 py-1.5"
          >
            {/* Tabs collapse to make room for the field. */}
            <div
              className={cn(
                "site-bottom-tabs flex min-w-0 items-center gap-1 overflow-hidden",
                searchOpen ? "w-0 opacity-0" : "flex-1 opacity-100",
              )}
            >
              {PRIMARY_TABS.map(({ href, icon, labelKey, match }) => (
                <BottomNavTab
                  key={href}
                  href={href}
                  label={t(labelKey)}
                  icon={icon}
                  active={match(pathname)}
                />
              ))}
            </div>

            <div
              ref={searchRef}
              aria-hidden={!searchOpen}
              className={cn(
                "site-bottom-search min-w-0 overflow-visible",
                searchOpen ? "flex-1 opacity-100" : "w-0 flex-none opacity-0",
              )}
            >
              <SearchBar className="w-full" onAnimeClick={closeSearch} />
            </div>

            <div className="ml-auto flex flex-none items-center gap-0.5">
              <BottomNavTab
                active={searchOpen}
                label={searchOpen ? t("nav.aria.closeSearch") : t("nav.search")}
                icon={searchOpen ? X : Search}
                onClick={() => setSearchOpen((open) => !open)}
              />
              {user && <NotificationBell />}
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
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
                      "site-bottom-tab relative flex h-11 w-11 flex-none items-center justify-center rounded-full",
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
                      <span className="site-bottom-dot absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary dark:bg-zinc-300" aria-hidden />
                    )}
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
