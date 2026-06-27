"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Container from "./container";
import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";
import SearchBar from "./search-bar";
import {
  CalendarDays,
  Captions,
  ChevronDown,
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
} from "lucide-react";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import LoginPopoverButton from "./login-popover-button";
import LanguageSwitcher from "./language-switcher";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import { anisurgeAuth, clearAnisurgeToken, authFromMeResponse } from "@/lib/anisurge";
import { usePathname } from "next/navigation";
import { useT } from "@/providers/i18n-provider";

const KITTY_ICON = "/jiji.jpg";

const MENU_DEFS = [
  { href: ROUTES.HOME, icon: Home, titleKey: "nav.home", shortKey: "nav.short.home" },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, titleKey: "nav.schedule", shortKey: "nav.short.schedule" },
  { href: ROUTES.TRENDING, icon: Flame, titleKey: "nav.trending", shortKey: "nav.short.trending" },
  { href: ROUTES.SUBTITLES, icon: Captions, titleKey: "nav.subtitles", shortKey: "nav.short.subtitles" },
  { href: ROUTES.FORUM, icon: MessagesSquare, titleKey: "nav.forum", shortKey: "nav.short.forum" },
  { href: ROUTES.CHAT, icon: MessageCircle, titleKey: "nav.chat", shortKey: "nav.short.chat" },
  { href: ROUTES.WATCH_TOGETHER, icon: Users, titleKey: "nav.watchTogether", shortKey: "nav.short.together" },
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
    "flex items-center gap-1.5 rounded-xl border border-transparent font-medium transition-all duration-150",
    compact ? "px-2.5 py-1.5 text-[13px]" : "px-3 py-1.5 text-sm",
    isActive
      ? "nav-link-active user-accent-nav-active font-semibold"
      : "text-white/50 hover:bg-white/[0.06] hover:border-white/[0.06] hover:text-white/90",
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
    <>
      <nav
        className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex 2xl:hidden"
        aria-label={t("nav.aria.mainNav")}
      >
        {primary.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} compact />
        ))}
        <MoreNavMenu items={secondary} pathname={pathname} isActive={secondaryActive} compact />
      </nav>

      <nav
        className="hidden min-w-0 items-center justify-center gap-0.5 2xl:flex"
        aria-label={t("nav.aria.mainNav")}
      >
        {menuItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </>
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
        className="w-52 border-white/[0.08] bg-[#0a0a10]/95 p-1.5 backdrop-blur-xl"
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
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white",
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

  useEffect(() => {
    if (user) return;

    let cancelled = false;
    const refreshAuth = async () => {
      try {
        const me = await anisurgeAuth.me();
        if (!cancelled) setAuth(authFromMeResponse(me));
      } catch (e: any) {
        if (!cancelled && e?.status === 401) {
          clearAnisurgeToken();
          clearAuth();
        }
      }
    };
    refreshAuth();
    return () => {
      cancelled = true;
    };
  }, [user, setAuth, clearAuth]);

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
        "fixed left-0 right-0 top-0 z-[100] transition-all duration-300",
        isScrolled
          ? "bg-[#050508]/92 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
          : "bg-gradient-to-b from-black/75 via-black/35 to-transparent",
      )}
    >
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent transition-opacity duration-300",
          isScrolled ? "opacity-100" : "opacity-40",
        )}
      />

      <Container className="relative">
        {searchOpen && (
          <div className="absolute inset-x-0 top-0 z-30 flex h-[var(--nav-height)] items-center gap-2 border-b border-white/[0.06] bg-[#050508]/95 px-4 backdrop-blur-2xl">
            <SearchBar className="flex-1" autoFocus onAnimeClick={() => setSearchOpen(false)} />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/8 hover:text-white"
              aria-label={t("nav.aria.closeSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex h-[var(--nav-height)] items-center gap-3 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4">
          {/* Brand */}
          <Link href={ROUTES.HOME} className="group relative z-20 flex shrink-0 items-center gap-2.5 lg:min-w-0">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-[0_0_12px_rgba(124,58,237,0.15)] ring-1 ring-violet-400/20 transition-all duration-200 group-hover:ring-violet-400/45">
              <Image src={KITTY_ICON} alt="AniKitty" fill className="object-cover object-top" unoptimized />
            </div>
            <span
              className={cn(
                nightTokyo.className,
                "hidden text-[1.05rem] font-bold tracking-[0.22em] text-white/90 transition-colors group-hover:text-white sm:block",
              )}
            >
              AniKitty
            </span>
          </Link>

          {/* Centered desktop navigation */}
          <div className="relative z-10 hidden min-w-0 justify-center lg:flex">
            <DesktopNav pathname={pathname} />
          </div>

          {/* Right actions */}
          <div className="relative z-20 ml-auto flex shrink-0 items-center justify-end gap-1 sm:gap-2 lg:ml-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              aria-label={t("nav.aria.openSearch")}
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-2 lg:flex">
              <LanguageSwitcher compact />
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
            </div>

            <div className="flex items-center gap-1 lg:hidden">
              <MobileMenuSheet pathname={pathname} trigger={<MenuIcon className="h-5 w-5 text-white/70" suppressHydrationWarning />} />
              {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

const MobileMenuSheet = ({ trigger, pathname }: { trigger: ReactNode; pathname: string }) => {
  const t = useT();
  const menuItems = useMenuItems();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="rounded-lg p-2 transition-colors hover:bg-white/8" aria-label={t("nav.aria.openMenu")}>
          {trigger}
        </button>
      </SheetTrigger>
      <SheetContent
        className="z-[150] flex w-[min(85vw,20rem)] flex-col border-white/[0.08] bg-[#050508]/98 backdrop-blur-2xl"
        hideCloseButton
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-violet-400/25">
                <Image src={KITTY_ICON} alt="" fill className="object-cover object-top" unoptimized />
              </div>
              <span className={cn(nightTokyo.className, "text-lg font-bold tracking-[0.18em] text-white")}>
                AniKitty
              </span>
            </div>
            <SheetClose className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/8 hover:text-white">
              <X className="h-4 w-4" />
            </SheetClose>
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
                      : "text-white/55 hover:border-white/[0.06] hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.06] p-4">
            <LanguageSwitcher className="w-full justify-between" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
