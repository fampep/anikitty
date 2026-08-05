"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crown,
  Home,
  LayoutGrid,
  ListFilter,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL } from "@/constants/site-meta";
import { useT } from "@/providers/i18n-provider";
import MoreNavMenu from "@/components/layout/more-nav-menu";
import { isNavActive, useMenuItems } from "@/components/layout/site-nav-menu";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";
import SearchBar from "@/components/layout/search-bar";
import NavbarAvatar from "@/components/layout/navbar-avatar";
import NotificationBell from "@/components/layout/notification-bell";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";

type PrimaryTab = {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  match: (pathname: string) => boolean;
};

/** Labelled links in the bar. Everything else lives behind the More menu. */
const PRIMARY_TABS: PrimaryTab[] = [
  {
    href: ROUTES.HOME,
    icon: Home,
    labelKey: "nav.short.home",
    match: (p) => p === ROUTES.HOME,
  },
  {
    href: ROUTES.TRENDING,
    icon: LayoutGrid,
    labelKey: "nav.short.trending",
    match: (p) => p === ROUTES.TRENDING || p.startsWith("/trending"),
  },
  {
    href: ROUTES.GENRE,
    icon: ListFilter,
    labelKey: "nav.short.genre",
    match: (p) => p.startsWith("/genre"),
  },
];

function shouldHideTopNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (isPublicAdminUiPath(pathname)) return true;
  return false;
}

/** Labelled pill link — the label collapses away on narrow viewports. */
function NavTab({
  active,
  label,
  icon: Icon,
  href,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  href: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "site-top-tab flex h-9 flex-none items-center gap-2 rounded-full px-2.5 text-[13px] font-medium sm:px-3",
        active
          ? "site-top-tab--active text-foreground dark:text-white"
          : "text-muted-foreground/70 hover:text-foreground/90 dark:text-white/45 dark:hover:text-white/85",
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={active ? 2.2 : 1.85} />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

/** Icon-only action button in the bar. */
function NavIconButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active?: boolean;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "site-top-icon flex h-9 w-9 flex-none items-center justify-center rounded-full",
        active
          ? "site-top-tab--active text-foreground dark:text-white"
          : "text-muted-foreground/70 hover:text-foreground/90 dark:text-white/45 dark:hover:text-white/85",
      )}
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
    </button>
  );
}

export default function SiteTopNav() {
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
    // The panel is still `visibility: hidden` this commit, and a hidden element
    // cannot take focus. A timeout rather than rAF so the focus survives React's
    // dev double-invoke and any focus the browser hands the toggle after a click.
    const focusTimer = window.setTimeout(() => {
      searchRef.current?.querySelector("input")?.focus();
    }, 80);
    // The overlay covers the viewport, so the page behind must not scroll under
    // it — otherwise the blurred backdrop slides while the panel sits still.
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

  if (shouldHideTopNav(pathname)) return null;

  const primaryHrefs = new Set<string>(PRIMARY_TABS.map((tab) => tab.href));
  const moreItems = menuItems.filter((item) => !primaryHrefs.has(item.href));
  const moreActive = moreItems.some((item) => isNavActive(pathname, item.href));

  const profileHref = user ? ROUTES.profile(user.username) : null;
  const profileActive = pathname.startsWith("/profile");

  return (
    <>
      {/* Centred search overlay — blurs the page behind and holds the results,
          so the list never has to fight the bar for room. */}
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

      {/* Floats over the page: `.pt-page` reserves the strip, and the home hero
          deliberately bleeds up underneath it. */}
      <header
        aria-label={t("nav.aria.mobileBottomNav")}
        className="site-top-nav fixed inset-x-0 top-0 z-[95] pointer-events-none"
      >
        <div className="mx-auto w-full max-w-5xl px-3 pt-[max(0.55rem,env(safe-area-inset-top))]">
          <div className="site-top-pill pointer-events-auto flex items-center gap-0.5 px-2 py-1.5">
            <Link
              href={ROUTES.HOME}
              aria-label={t("nav.short.home")}
              className="site-top-brand mr-1 flex h-9 w-9 flex-none items-center justify-center rounded-full"
            >
              <Image
                src="/anikitty-logo.png"
                alt=""
                width={26}
                height={26}
                className="h-[26px] w-[26px] object-contain"
                priority
              />
            </Link>

            <nav
              aria-label={t("nav.aria.mobileBottomNav")}
              className="flex min-w-0 items-center gap-0.5"
            >
              {PRIMARY_TABS.map(({ href, icon, labelKey, match }) => (
                <NavTab
                  key={href}
                  href={href}
                  label={t(labelKey)}
                  icon={icon}
                  active={match(pathname)}
                />
              ))}
              {profileHref && (
                <NavTab
                  href={profileHref}
                  label={t("nav.short.profile")}
                  icon={UserRound}
                  active={profileActive}
                />
              )}
            </nav>

            {/* Splits navigation from account actions, as in the reference bar. */}
            <span
              className="mx-1.5 hidden h-5 w-px flex-none bg-border/70 dark:bg-white/[0.1] sm:block"
              aria-hidden
            />

            <div className="ml-auto flex flex-none items-center gap-0.5">
              <NavIconButton
                active={searchOpen}
                label={searchOpen ? t("nav.aria.closeSearch") : t("nav.search")}
                icon={searchOpen ? X : Search}
                onClick={() => setSearchOpen((open) => !open)}
              />
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                title={t("footer.discord")}
                aria-label={t("footer.discord")}
                className="site-top-icon flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground/70 hover:text-[#5865f2] dark:text-white/45 dark:hover:text-[#7986ff]"
              >
                <DiscordLogoIcon width="17" height="17" />
              </a>
              <Link
                href={ROUTES.SHOP}
                title={t("nav.short.shop")}
                aria-label={t("nav.short.shop")}
                className="site-top-icon flex h-9 w-9 flex-none items-center justify-center rounded-full text-amber-400/80 hover:text-amber-300"
              >
                <Crown className="h-[17px] w-[17px]" strokeWidth={1.9} />
              </Link>
              {user && <NotificationBell />}
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
              <MoreNavMenu
                pathname={pathname}
                items={moreItems}
                side="bottom"
                trigger={
                  <button
                    type="button"
                    title={t("nav.more")}
                    aria-label={t("nav.more")}
                    aria-haspopup="dialog"
                    className={cn(
                      "site-top-icon flex h-9 w-9 flex-none items-center justify-center rounded-full",
                      moreActive
                        ? "site-top-tab--active text-foreground dark:text-white"
                        : "text-muted-foreground/70 hover:text-foreground/90 dark:text-white/45 dark:hover:text-white/85",
                      "data-[state=open]:bg-primary/10 data-[state=open]:text-primary dark:data-[state=open]:text-white",
                    )}
                  >
                    <LayoutGrid className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
