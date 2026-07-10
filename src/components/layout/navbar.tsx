"use client";

import Link from "next/link";
import { cn } from "@/lib/core/utils";
import Container from "./container";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import SearchBar from "./search-bar";
import {
  CalendarDays,
  Captions,
  ChevronDown,
  Coffee,
  Coins,
  Flame,
  HelpCircle,
  Home,
  MenuIcon,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  SearchIcon,
  Users,
  X,
  Activity,
} from "lucide-react";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import NotificationBell from "./notification-bell";
import { anisurgeAuth, clearAnisurgeToken, authFromMeResponse } from "@/lib/oauth/anisurge";
import { hasLikelyAuthSession } from "@/lib/auth/auth-fetch";
import { usePathname } from "next/navigation";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import Image from "next/image";
import { SITE_LOGO } from "@/lib/seo/site-seo";
import { useKittycoins } from "@/hooks/use-kittycoins";

const MENU_DEFS = [
  { href: ROUTES.HOME, icon: Home, titleKey: "nav.home", shortKey: "nav.short.home" },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, titleKey: "nav.schedule", shortKey: "nav.short.schedule" },
  { href: ROUTES.TRENDING, icon: Flame, titleKey: "nav.trending", shortKey: "nav.short.trending" },
  { href: ROUTES.SUBTITLES, icon: Captions, titleKey: "nav.subtitles", shortKey: "nav.short.subtitles" },
  { href: ROUTES.FORUM, icon: MessagesSquare, titleKey: "nav.forum", shortKey: "nav.short.forum" },
  { href: ROUTES.CHAT, icon: MessageCircle, titleKey: "nav.chat", shortKey: "nav.short.chat" },
  { href: ROUTES.WATCH_TOGETHER, icon: Users, titleKey: "nav.watchTogether", shortKey: "nav.short.together" },
  { href: ROUTES.SHOP, icon: Coins, titleKey: "nav.shop", shortKey: "nav.short.shop" },
  { href: ROUTES.DONATE, icon: Coffee, titleKey: "nav.donate", shortKey: "nav.short.donate" },
  { href: ROUTES.STATUS, icon: Activity, titleKey: "nav.status", shortKey: "nav.short.status" },
  { href: ROUTES.FAQ, icon: HelpCircle, titleKey: "nav.faq", shortKey: "nav.short.faq" },
] as const;

const PRIMARY_NAV_COUNT = 5;

type MenuItem = {
  href: string;
  icon: (typeof MENU_DEFS)[number]["icon"];
  title: string;
  short: string;
};

function useMenuItems(): MenuItem[] {
  const t = useT();
  return MENU_DEFS.map((item) => ({
    href: item.href,
    icon: item.icon,
    title: t(item.titleKey),
    short: t(item.shortKey),
  }));
}

function navLinkClass(isActive: boolean, compact = false) {
  return cn(
    "flex items-center gap-1.5 rounded-xl border border-transparent font-medium transition-all duration-200",
    compact ? "px-2.5 py-1.5 text-[13px]" : "px-3 py-1.5 text-sm",
    isActive
      ? "nav-link-active user-accent-nav-active font-semibold"
      : "text-muted-foreground hover:bg-accent hover:border-border hover:text-foreground dark:hover:text-white/55 dark:bg-white/[0.07] dark:border-white/[0.08] dark:text-white/95",
  );
}

function NavLink({
  item,
  pathname,
  compact,
  onClick,
}: {
  item: MenuItem;
  pathname: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.title}
      onClick={onClick}
      className={navLinkClass(isActive, compact)}
    >
      <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 shrink-0")} />
      <span className="whitespace-nowrap xl:hidden">{item.short}</span>
      <span className="hidden whitespace-nowrap xl:inline">{item.title}</span>
    </Link>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  const t = useT();
  const menuItems = useMenuItems();
  const primary = menuItems.slice(0, PRIMARY_NAV_COUNT);
  const secondary = menuItems.slice(PRIMARY_NAV_COUNT);
  const secondaryActive = secondary.some((item) => pathname === item.href);

  return (
    <nav
      className="hidden min-w-0 items-center justify-center gap-0.5 rounded-2xl border border-border/60 bg-card/50 p-1 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03] lg:flex"
      aria-label={t("nav.aria.mainNav")}
    >
      {primary.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} compact />
      ))}
      <MoreNavMenu items={secondary} pathname={pathname} isActive={secondaryActive} compact />
    </nav>
  );
}

function MoreNavMenu({
  items,
  pathname,
  isActive,
  compact,
}: {
  items: readonly MenuItem[];
  pathname: string;
  isActive: boolean;
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(navLinkClass(isActive, compact), "cursor-pointer")}
          aria-label={t("nav.aria.morePages")}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span>{t("nav.more")}</span>
          <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={10}
        className="w-52 border-border bg-popover/95 p-1.5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0a10]/95"
      >
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "nav-link-active user-accent-nav-active font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:text-white/60 dark:bg-white/[0.06] dark:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DesktopSearchTrigger({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group hidden h-9 shrink-0 items-center rounded-xl border border-border bg-muted/40",
        "text-muted-foreground transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-foreground",
        "dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/55 dark:hover:border-violet-400/25 dark:hover:bg-violet-500/[0.06] dark:hover:text-white",
        "lg:inline-flex",
        "w-9 justify-center p-0",
        "xl:w-[min(15rem,calc(100vw-42rem))] xl:justify-start xl:gap-2.5 xl:px-3",
      )}
      aria-label={t("nav.aria.openSearch")}
    >
      <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-violet-600 dark:text-white/40 dark:group-hover:text-violet-300/80" />
      <span className="hidden min-w-0 flex-1 truncate text-left text-[13px] text-muted-foreground transition-colors group-hover:text-foreground xl:block dark:text-white/35 dark:group-hover:text-white/55">
        {t("search.placeholder")}
      </span>
      <kbd className="pointer-events-none hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono leading-none text-muted-foreground xl:inline-block dark:border-white/[0.08] dark:bg-black/25 dark:text-white/25">
        Ctrl&nbsp;K
      </kbd>
    </button>
  );
}

function KittycoinPill() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { balance, loaded } = useKittycoins(!!auth);

  if (!auth) return null;

  return (
    <Link
      href={ROUTES.SHOP}
      title={t("nav.shop")}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[12px] font-bold text-amber-200/90 tabular-nums transition-colors hover:bg-amber-500/15 hover:border-amber-400/30"
    >
      <Coins className="h-3.5 w-3.5 shrink-0" />
      {loaded ? balance.toLocaleString() : "—"}
    </Link>
  );
}

const NavBar = () => {
  const t = useT();
  const user = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  const isScrolled = useScrolledPast(20);
  const isLanding = pathname === "/";
  const [searchOpen, setSearchOpen] = useState(false);
  const authBag = React.useMemo(
    () => ({ auth: user, setAuth, clearAuth }),
    [user, setAuth, clearAuth],
  );

  const meProbeRef = useRef(false);

  useEffect(() => {
    if (user) {
      meProbeRef.current = false;
      return;
    }
    if (meProbeRef.current) return;
    if (!hasLikelyAuthSession()) {
      meProbeRef.current = true;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const me = await anisurgeAuth.me();
          if (!cancelled) setAuth(authFromMeResponse(me));
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          if (!cancelled && status === 401) {
            clearAnisurgeToken();
            clearAuth();
          }
        } finally {
          if (!cancelled) meProbeRef.current = true;
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, setAuth, clearAuth]);

  const discordHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || discordHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const discord = params.get("discord");
    if (!discord) return;

    discordHandledRef.current = true;

    const errorKeys: Record<string, string> = {
      cancelled: "auth.discordCancelled",
      not_configured: "auth.discordNotConfigured",
      banned: "auth.discordBanned",
      email_conflict: "auth.discordEmailConflict",
      invalid_state: "auth.discordLoginFailed",
      token_exchange: "auth.discordLoginFailed",
      user_fetch: "auth.discordLoginFailed",
      server: "auth.discordLoginFailed",
    };

    if (discord === "welcome") {
      toast.success(t("auth.discordWelcome"));
      void anisurgeAuth.me().then((me) => setAuth(authFromMeResponse(me))).catch(() => {});
    } else {
      const key = errorKeys[discord] ?? "auth.discordLoginFailed";
      toast.error(t(key));
    }

    params.delete("discord");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [setAuth, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (isLanding) return null;

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-[100] pt-safe transition-all duration-300",
        isScrolled
          ? "border-b border-border/50 bg-background/96 shadow-lg dark:border-transparent dark:bg-[#08080f]/97 dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          : "bg-gradient-to-b from-background/95 via-background/50 to-transparent dark:from-black/80 dark:via-black/40",
      )}
    >
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent transition-opacity duration-300",
          isScrolled ? "opacity-100" : "opacity-50",
        )}
      />

      <Container className="relative">
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-30 flex h-[var(--nav-height)] items-center gap-3 border-b border-border bg-background px-4 dark:border-white/[0.06] dark:bg-[#050508]">
            <SearchBar className="flex-1 max-w-3xl mx-auto" autoFocus onAnimeClick={() => setSearchOpen(false)} />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:text-white/50 dark:bg-white/8 dark:text-white"
              aria-label={t("nav.aria.closeSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex h-[var(--nav-height)] items-center gap-3 sm:gap-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-x-6">
          {/* Brand */}
          <Link href={ROUTES.HOME} className="group relative z-20 flex shrink-0 items-center">
            <Image
              src={SITE_LOGO}
              alt="AniKitty"
              width={132}
              height={48}
              className="h-8 w-auto max-w-[7.5rem] sm:max-w-none sm:h-9 object-contain transition-opacity group-hover:opacity-95"
              priority
              unoptimized
            />
          </Link>

          {/* Centered desktop navigation */}
          <div className="relative z-10 hidden min-w-0 justify-center overflow-hidden px-1 lg:flex">
            <DesktopNav pathname={pathname} />
          </div>

          {/* Right actions */}
          <div className="relative z-20 ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-2.5 lg:ml-0">
            <DesktopSearchTrigger onClick={() => setSearchOpen(true)} />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="touch-target rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden dark:text-white/60 dark:bg-white/8 dark:text-white"
              aria-label={t("nav.aria.openSearch")}
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-1.5 sm:gap-2 lg:flex">
              {user && <KittycoinPill />}
              {user && <NotificationBell />}
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              {user && <KittycoinPill />}
              {user && <NotificationBell />}
              <MobileMenuSheet
                pathname={pathname}
                onSearchClick={() => setSearchOpen(true)}
                trigger={<MenuIcon className="h-5 w-5 text-muted-foreground dark:text-white/70" suppressHydrationWarning />}
              />
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

const MobileMenuSheet = ({
  trigger,
  pathname,
  onSearchClick,
}: {
  trigger: ReactNode;
  pathname: string;
  onSearchClick?: () => void;
}) => {
  const t = useT();
  const menuItems = useMenuItems();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="touch-target rounded-lg p-2.5 transition-colors hover:bg-accent dark:hover:bg-white/8" aria-label={t("nav.aria.openMenu")}>
          {trigger}
        </button>
      </SheetTrigger>
      <SheetContent
        className="z-[150] flex w-[min(85vw,20rem)] flex-col border-border bg-background/98 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#050508]/98"
        hideCloseButton
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-white/8">
            <Image
              src={SITE_LOGO}
              alt="AniKitty"
              width={120}
              height={44}
              className="h-8 w-auto object-contain"
              unoptimized
            />
            <SheetClose
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:text-white/50 dark:bg-white/8 dark:text-white"
              aria-label={t("nav.aria.closeMenu")}
            >
              <X className="h-4 w-4" />
            </SheetClose>
          </div>

          <div className="border-b border-border p-4 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSearchClick?.();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-accent dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/70 dark:border-white/15 dark:bg-white/[0.08] dark:text-white"
            >
              <SearchIcon className="h-4 w-4 shrink-0" />
              {t("nav.search")}
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label={t("nav.aria.mobileNav")}>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium transition-all",
                    isActive
                      ? "nav-link-active user-accent-nav-active"
                      : "text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground dark:hover:text-white/55 dark:border-white/[0.06] dark:bg-white/[0.06] dark:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
