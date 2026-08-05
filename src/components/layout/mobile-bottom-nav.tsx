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
    "site-bottom-tab relative flex h-11 w-11 flex-none items-center justify-center rounded-full transition-all duration-200",
    active
      ? "text-foreground dark:text-white"
      : "text-muted-foreground/65 hover:text-foreground/85 dark:text-white/40 dark:hover:text-white/80 hover:bg-primary/5 dark:hover:bg-white/5",
  );

  const iconEl = (
    <>
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-all duration-200",
          active && "text-primary dark:text-zinc-300"
        )}
        strokeWidth={active ? 2.25 : 1.85}
      />
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
    // The panel is still `visibility: hidden` this commit, and a hidden
    // element cannot take focus. A timeout rather than rAF so the focus
    // survives React's dev double-invoke of this effect, and any focus the
    // browser hands to the toggle button after a real click.
    const focusTimer = window.setTimeout(() => {
      searchRef.current?.querySelector("input")?.focus();
    }, 80);
    // The overlay covers the viewport, so the page behind must not scroll
    // under it — otherwise the blurred backdrop slides while the panel sits still.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
    };
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
      {/* Centred search overlay — blurs the page behind and holds the results,
          so the list never has to fight the bottom pill for room. */}
      <div
        data-open={searchOpen || undefined}
        aria-hidden={!searchOpen}
        className="site-search-overlay fixed inset-0 z-[110]"
      >
        <button
          type="button"
          aria-label={t("nav.aria.closeSearch")}
          onClick={closeSearch}
          className="site-search-scrim absolute inset-0 cursor-default"
        />
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-[14vh]">
          <div
            ref={searchRef}
            role="dialog"
            aria-modal={searchOpen || undefined}
            aria-label={t("nav.search")}
            className="site-search-panel pointer-events-auto w-full max-w-xl rounded-2xl p-2.5"
          >
            <SearchBar inline className="w-full" onAnimeClick={closeSearch} />
          </div>
        </div>
      </div>

      {/* No layout reservation: the pill is fixed and floats over content, so
          a spacer here only adds dead space at the end of the page. */}
      <nav
        aria-label={t("nav.aria.mobileBottomNav")}
        className="site-mobile-nav fixed inset-x-0 bottom-0 z-[95] pointer-events-none"
      >
        <div className="site-bottom-shell mx-auto max-w-md px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:max-w-lg">
          <div
            data-search-open={searchOpen || undefined}
            className="site-bottom-nav pointer-events-auto flex items-center gap-1 px-2 py-1.5"
          >
            <div className="site-bottom-tabs flex min-w-0 flex-1 items-center gap-1">
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
                      "site-bottom-tab relative flex h-11 w-11 flex-none items-center justify-center rounded-full transition-all duration-200",
                      moreActive
                        ? "text-foreground dark:text-white"
                        : "text-muted-foreground/65 hover:text-foreground/85 dark:text-white/40 dark:hover:text-white/80 hover:bg-primary/5 dark:hover:bg-white/5",
                      "data-[state=open]:bg-primary/10 data-[state=open]:text-primary dark:data-[state=open]:text-zinc-300",
                    )}
                  >
                    <Menu
                      className={cn(
                        "h-[18px] w-[18px] transition-all duration-200",
                        moreActive && "text-primary dark:text-zinc-300",
                      )}
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
